from __future__ import annotations

import logging

from backend.modules.auth.models import UserScope
from backend.modules.bot.interfaces import CampusEventPublisher, EventDraftExtractor
from backend.modules.bot.repository import BotUserRepository, EventBotSubmissionRepository
from backend.modules.bot.schemas.event_post import (
    EventPostResult,
    TelegramEventPostInput,
)
from backend.modules.campuscurrent.models.community import Community
from backend.modules.campuscurrent.models.events import (
    EventBotSubmission,
    EventBotSubmissionStatus,
    RegistrationPolicy,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class EventPostService:
    """
    Orchestrates Telegram /post → Gemini extract → Event create.

    Depends on EventDraftExtractor and CampusEventPublisher via constructor DI.
    """

    def __init__(
        self,
        *,
        db_session: AsyncSession,
        draft_extractor: EventDraftExtractor,
        event_publisher: CampusEventPublisher,
        submission_repository: EventBotSubmissionRepository | None = None,
        user_repository: BotUserRepository | None = None,
    ) -> None:
        self.db_session = db_session
        self.draft_extractor = draft_extractor
        self.event_publisher = event_publisher
        self.submission_repository = submission_repository or EventBotSubmissionRepository(
            db_session
        )
        self.user_repository = user_repository or BotUserRepository(db_session)

    async def submit_from_telegram(
        self,
        payload: TelegramEventPostInput,
        *,
        image_bytes: bytes | None = None,
        image_mime_type: str | None = None,
    ) -> EventPostResult:
        user = await self.user_repository.get_by_telegram_id(payload.submitter_telegram_id)
        if user is None:
            raise PermissionError(
                "Telegram account is not linked. Sign in on Nuspace and bind Telegram first."
            )
        if user.scope == UserScope.banned:
            raise PermissionError("Your account is banned from posting events.")

        submission = EventBotSubmission(
            submitter_sub=user.sub,
            submitter_telegram_id=payload.submitter_telegram_id,
            status=EventBotSubmissionStatus.pending_extract,
            origin_type=payload.origin_type,
            origin_chat_id=payload.origin_chat_id,
            origin_message_id=payload.origin_message_id,
            forward_date=payload.forward_date,
            forward_sender_name=payload.forward_sender_name,
            media_file_unique_id=payload.media_file_unique_id,
            bot_chat_id=payload.bot_chat_id,
            bot_message_id=payload.bot_message_id,
            raw_caption=payload.caption,
            raw_payload=payload.raw_payload,
            registration_link=payload.link_urls[0] if payload.link_urls else None,
        )
        await self.submission_repository.create(submission)

        caption = (payload.caption or "").strip()
        if not caption:
            submission.status = EventBotSubmissionStatus.needs_info
            submission.reject_reason = "missing_caption"
            await self.submission_repository.save(submission)
            return EventPostResult(
                submission_id=submission.id,
                status=submission.status,
                message=(
                    "Post has no text. Reply with date, place, and details, "
                    "or forward a captioned post."
                ),
            )

        try:
            draft = await self.draft_extractor.extract_event_draft(
                caption=caption,
                link_urls=payload.link_urls,
                user_id=user.sub,
            )
        except Exception as exc:
            logger.exception("Gemini event extraction failed for submission")
            submission.status = EventBotSubmissionStatus.failed
            submission.reject_reason = str(exc)[:500]
            await self.submission_repository.save(submission)
            return EventPostResult(
                submission_id=submission.id,
                status=submission.status,
                message="Could not parse this post right now. Try again later.",
            )

        submission.extracted_json = draft.model_dump(mode="json")
        if draft.registration_link:
            submission.registration_link = draft.registration_link

        if draft.reject:
            submission.status = EventBotSubmissionStatus.rejected
            submission.reject_reason = draft.reject_reason or "rejected_by_model"
            await self.submission_repository.save(submission)
            return EventPostResult(
                submission_id=submission.id,
                status=submission.status,
                draft=draft,
                message=draft.reject_reason or "This post cannot be published as an event.",
            )

        if not draft.is_complete:
            submission.status = EventBotSubmissionStatus.needs_info
            submission.reject_reason = (
                f"missing:{','.join(draft.missing_fields)}"
                if draft.missing_fields
                else "incomplete"
            )
            await self.submission_repository.save(submission)
            missing = ", ".join(draft.missing_fields) if draft.missing_fields else "required fields"
            return EventPostResult(
                submission_id=submission.id,
                status=submission.status,
                draft=draft,
                message=f"Not enough info to create an event. Missing: {missing}.",
            )

        assert draft.name and draft.place and draft.start_datetime and draft.end_datetime
        assert draft.description and draft.type

        community_result = await self.db_session.execute(
            select(Community).where(Community.head == user.sub)
        )
        community = community_result.scalars().first()

        if community is not None:
            event_id = await self.event_publisher.publish_community_event(
                creator_sub=user.sub,
                community_id=community.id,
                name=draft.name,
                place=draft.place,
                start_datetime=draft.start_datetime,
                end_datetime=draft.end_datetime,
                description=draft.description,
                event_type=draft.type,
                policy=draft.policy or RegistrationPolicy.open,
                registration_link=draft.registration_link or submission.registration_link,
                image_bytes=image_bytes,
                image_mime_type=image_mime_type,
            )
        else:
            event_id = await self.event_publisher.publish_personal_event(
                creator_sub=user.sub,
                name=draft.name,
                place=draft.place,
                start_datetime=draft.start_datetime,
                end_datetime=draft.end_datetime,
                description=draft.description,
                event_type=draft.type,
                policy=draft.policy or RegistrationPolicy.open,
                registration_link=draft.registration_link or submission.registration_link,
                image_bytes=image_bytes,
                image_mime_type=image_mime_type,
            )

        submission.event_id = event_id
        submission.status = EventBotSubmissionStatus.published
        await self.submission_repository.save(submission)

        return EventPostResult(
            submission_id=submission.id,
            status=submission.status,
            event_id=event_id,
            draft=draft,
            message="Event published.",
        )
