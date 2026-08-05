import hashlib
import secrets
from collections import defaultdict
from datetime import timedelta
from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.datetime_utils import utc_now
from backend.common.schemas import Infra, ShortUserResponse
from backend.common.utils import response_builder
from backend.modules.campuscurrent.events import schemas, utils
from backend.modules.campuscurrent.events.attendees_export import (
    build_attendees_csv,
    build_attendees_xlsx,
)
from backend.modules.campuscurrent.events.interfaces import MediaAttachmentResolver
from backend.modules.campuscurrent.events.policy import EventPolicy
from backend.modules.campuscurrent.events.repository import EventRepository
from backend.modules.campuscurrent.models import Event, EventAccessPurpose
from backend.modules.media.models import EntityType, Media, MediaFormat

_ACCESS_INVITE_TTL = timedelta(days=7)


class EventService:
    def __init__(
        self,
        db_session: AsyncSession,
        media_attachment_resolver: MediaAttachmentResolver,
        repo: EventRepository | None = None,
    ):
        self.db_session = db_session
        self.media_attachment_resolver = media_attachment_resolver
        self.repo = repo or EventRepository(db_session)

    async def _get_event_or_404(self, event_id: int) -> Event:
        event = await self.repo.get_event_by_id(event_id)
        if event is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
        return event

    async def _ensure_user_exists(self, sub: str) -> None:
        if await self.repo.get_user_by_sub(sub) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    async def add_event(
        self,
        infra: Infra,
        event_data: schemas.EventCreateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        EventPolicy(user=user).check_create(event_data)

        creator_sub = (
            user[0].get("sub") if event_data.creator_sub == "me" else event_data.creator_sub
        )
        await self._ensure_user_exists(creator_sub)

        event_data: schemas.EnrichedEventCreateRequest = await utils.EventEnrichmentService(
            user=user
        ).enrich_event_data(event_data)

        event: Event = await self.repo.create_event(event_data)
        await self.repo.upsert_search(infra.meilisearch_client, event)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def update_event(
        self,
        infra: Infra,
        event_id: int,
        event_data: schemas.EventUpdateRequest,
        user: tuple[dict, dict],
    ) -> schemas.EventResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_update(event=event, event_data=event_data)

        media_ids_to_delete = event_data.media_ids_to_delete or []
        event: Event = await self.repo.update_event(event=event, event_data=event_data)
        await self.repo.upsert_search(infra.meilisearch_client, event)

        if media_ids_to_delete:
            await self._delete_event_media(infra, event, media_ids_to_delete)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def _delete_event_media(
        self,
        infra: Infra,
        event: Event,
        media_ids: List[int],
    ) -> None:
        media_objects = await self.media_attachment_resolver.list_by_ids(media_ids)

        found_ids = {media.id for media in media_objects}
        missing = set(media_ids) - found_ids
        if missing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Media not found: {sorted(missing)}",
            )

        for media in media_objects:
            if media.entity_type != EntityType.community_events or media.entity_id != event.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Media does not belong to this event",
                )

        await self.media_attachment_resolver.delete_many(media_objects)

    async def delete_event(self, infra: Infra, event_id: int, user: tuple[dict, dict]) -> None:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_delete(event=event)

        media_objects: List[Media] = await self.repo.list_media(event_ids=[event.id])
        await self.media_attachment_resolver.delete_many(media_objects)

        event_deleted, _ = await self.repo.delete_event_and_media(event=event, media_objects=[])
        if not event_deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

        await self.repo.delete_from_search(
            meilisearch_client=infra.meilisearch_client, event_id=event_id
        )

    def _is_guest(self, user: tuple[dict, dict]) -> bool:
        return bool(user[1].get("is_guest")) or user[0].get("sub") == "guest"

    async def _build_event_responses(
        self,
        events: List[Event],
        infra: Infra,
        user: tuple[dict, dict],
    ) -> List[schemas.EventResponse]:
        if not events:
            return []

        event_ids: List[int] = [event.id for event in events]
        all_media_objs: List[Media] = await self.repo.list_media(
            event_ids=event_ids,
            event_media_formats=[MediaFormat.carousel],
        )

        url_map = await self.media_attachment_resolver.build_url_map(all_media_objs)

        event_media_by_id = defaultdict(list)
        for media in all_media_objs:
            if media.entity_type == EntityType.community_events:
                event_media_by_id[media.entity_id].append(media)

        attendees_count_by_id = await self.repo.count_attendees_by_event_ids(event_ids)
        creators_by_event_id = await self.repo.list_creators_by_event_ids(event_ids)
        going_event_ids: set[int] = set()
        viewer_event_ids: set[int] = set()
        if not self._is_guest(user):
            user_sub = user[0].get("sub")
            going_event_ids = await self.repo.list_going_event_ids(event_ids, user_sub)
            viewer_event_ids = await self.repo.list_attendee_viewer_event_ids(
                event_ids, user_sub
            )

        event_responses: List[schemas.EventResponse] = []
        for event in events:
            event_media_objects: List[Media] = event_media_by_id.get(event.id, [])
            event_media_responses = self.media_attachment_resolver.to_responses(
                event_media_objects, url_map
            )
            creator = creators_by_event_id.get(event.id)
            if creator is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Creator not found for event {event.id}",
                )

            event_responses.append(
                response_builder.build_schema(
                    schemas.EventResponse,
                    schemas.BaseEventSchema.model_validate(event),
                    media=event_media_responses,
                    creator=ShortUserResponse.model_validate(creator),
                    permissions=EventPolicy(user=user).get_permissions(
                        event,
                        is_attendee_viewer=event.id in viewer_event_ids,
                    ),
                    attendees_count=attendees_count_by_id.get(event.id, 0),
                    is_going=event.id in going_event_ids,
                )
            )
        return event_responses

    @staticmethod
    def _hash_access_token(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _invite_is_active(invite, *, now=None) -> bool:
        now = now or utc_now()
        if invite.revoked_at is not None:
            return False
        if invite.accepted_at is not None and invite.purpose == EventAccessPurpose.transfer:
            return False
        if invite.expires_at <= now:
            return False
        return True

    async def set_going(self, event_id: int, user: tuple[dict, dict]) -> schemas.EventGoingResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_rsvp(event=event)

        user_sub = user[0]["sub"]
        await self.repo.add_attendee(event_id=event.id, user_sub=user_sub)
        return schemas.EventGoingResponse(
            attendees_count=await self.repo.count_attendees(event.id),
            is_going=True,
        )

    async def unset_going(
        self, event_id: int, user: tuple[dict, dict]
    ) -> schemas.EventGoingResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_rsvp(event=event)

        user_sub = user[0]["sub"]
        await self.repo.remove_attendee(event_id=event.id, user_sub=user_sub)
        return schemas.EventGoingResponse(
            attendees_count=await self.repo.count_attendees(event.id),
            is_going=False,
        )

    async def list_attendees(
        self,
        event_id: int,
        user: tuple[dict, dict],
        *,
        page: int = 1,
        size: int = 20,
    ) -> schemas.ListEventAttendeesResponse:
        event = await self._get_event_or_404(event_id)
        policy = EventPolicy(user=user)
        policy.check_read_one(event=event)
        is_viewer = await self.repo.is_attendee_viewer(event.id, policy.user_sub)
        policy.check_list_attendees(event=event, is_viewer=is_viewer)

        rows, total = await self.repo.list_attendees(event.id, page=page, size=size)
        items = [
            schemas.EventAttendeeResponse(
                sub=user_row.sub,
                name=user_row.name,
                surname=user_row.surname,
                picture=user_row.picture or "",
                email=user_row.email,
                going_at=going_at,
            )
            for user_row, going_at in rows
        ]
        total_pages = response_builder.calculate_pages(count=total, size=size)
        return schemas.ListEventAttendeesResponse(
            items=items,
            total=total,
            page=page,
            size=size,
            has_next=page < total_pages,
        )

    async def export_attendees(
        self,
        event_id: int,
        user: tuple[dict, dict],
        export_format: schemas.EventAttendeesExportFormat,
    ) -> tuple[bytes, str, str]:
        event = await self._get_event_or_404(event_id)
        policy = EventPolicy(user=user)
        policy.check_read_one(event=event)
        is_viewer = await self.repo.is_attendee_viewer(event.id, policy.user_sub)
        policy.check_list_attendees(event=event, is_viewer=is_viewer)

        rows = await self.repo.list_all_attendees_for_export(event.id)
        safe_name = (
            "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in event.name)[:60]
            or "event"
        )

        if export_format == schemas.EventAttendeesExportFormat.csv:
            content = build_attendees_csv(event, rows)
            filename = f"nuspace_{safe_name}_attendance.csv"
            media_type = "text/csv; charset=utf-8"
            return content, filename, media_type

        content = build_attendees_xlsx(event, rows)
        filename = f"nuspace_{safe_name}_attendance.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        return content, filename, media_type

    async def get_event_by_id(
        self, infra: Infra, event_id: int, user: tuple[dict, dict]
    ) -> schemas.EventResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_read_one(event=event)

        event_responses = await self._build_event_responses([event], infra, user)
        return event_responses[0]

    async def get_events(
        self, user: tuple[dict, dict], event_filter: schemas.EventFilter, infra: Infra
    ) -> schemas.ListEventResponse:
        EventPolicy(user=user).check_read_list(
            creator_sub=event_filter.creator_sub,
            event_status=event_filter.event_status,
        )

        creator_sub = (
            user[0].get("sub") if event_filter.creator_sub == "me" else event_filter.creator_sub
        )

        events, count, keyword_no_results = await self.repo.list_events(
            event_filter=event_filter,
            creator_sub=creator_sub,
            meilisearch_client=infra.meilisearch_client,
        )

        if keyword_no_results:
            return schemas.ListEventResponse(
                items=[],
                total_pages=1,
                total=0,
                page=event_filter.page,
                size=event_filter.size,
                has_next=False,
            )

        event_responses: List[schemas.EventResponse] = await self._build_event_responses(
            events, infra, user
        )

        total_pages: int = response_builder.calculate_pages(count=count, size=event_filter.size)
        page = event_filter.page
        size = event_filter.size
        has_next = page < total_pages

        return schemas.ListEventResponse(
            items=event_responses,
            total_pages=total_pages,
            total=count,
            page=page,
            size=size,
            has_next=has_next,
        )

    async def create_access_invite(
        self,
        event_id: int,
        user: tuple[dict, dict],
        body: schemas.EventAccessInviteCreateRequest,
    ) -> schemas.EventAccessInviteCreatedResponse:
        event = await self._get_event_or_404(event_id)
        policy = EventPolicy(user=user)
        policy.check_share_access(event=event)

        raw_token = secrets.token_urlsafe(32)
        token_hash = self._hash_access_token(raw_token)
        expires_at = utc_now() + _ACCESS_INVITE_TTL
        invite = await self.repo.create_access_invite(
            event_id=event.id,
            purpose=body.purpose,
            token_hash=token_hash,
            created_by_sub=policy.user_sub,
            expires_at=expires_at,
        )
        return schemas.EventAccessInviteCreatedResponse(
            id=invite.id,
            purpose=invite.purpose,
            token=raw_token,
            url_path=f"/events?access={raw_token}",
            expires_at=invite.expires_at,
        )

    async def list_access_invites(
        self, event_id: int, user: tuple[dict, dict]
    ) -> schemas.ListEventAccessInvitesResponse:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_share_access(event=event)

        now = utc_now()
        invites = await self.repo.list_access_invites(event.id)
        items = [
            schemas.EventAccessInviteResponse(
                id=invite.id,
                purpose=invite.purpose,
                created_by_sub=invite.created_by_sub,
                expires_at=invite.expires_at,
                revoked_at=invite.revoked_at,
                accepted_at=invite.accepted_at,
                accepted_by_sub=invite.accepted_by_sub,
                created_at=invite.created_at,
                is_active=True,
            )
            for invite in invites
            if self._invite_is_active(invite, now=now)
        ]
        return schemas.ListEventAccessInvitesResponse(items=items)

    async def revoke_access_invite(
        self, event_id: int, invite_id: int, user: tuple[dict, dict]
    ) -> None:
        event = await self._get_event_or_404(event_id)
        EventPolicy(user=user).check_share_access(event=event)

        invite = await self.repo.get_access_invite(invite_id)
        if invite is None or invite.event_id != event.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
        if invite.revoked_at is None:
            invite.revoked_at = utc_now()
            await self.db_session.flush()

    async def accept_access_invite(
        self, user: tuple[dict, dict], body: schemas.EventAccessInviteAcceptRequest
    ) -> schemas.EventAccessInviteAcceptResponse:
        policy = EventPolicy(user=user)
        token_hash = self._hash_access_token(body.token.strip())
        invite = await self.repo.get_access_invite_by_token_hash(token_hash)
        if invite is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

        if not self._invite_is_active(invite):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Invite is expired, revoked, or already used",
            )

        event = await self._get_event_or_404(invite.event_id)
        if invite.created_by_sub == policy.user_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot accept your own access invite",
            )

        if invite.purpose == EventAccessPurpose.transfer:
            if event.creator_sub == policy.user_sub:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You already own this event",
                )
            await self.repo.transfer_event_ownership(event, policy.user_sub)
            invite.accepted_at = utc_now()
            invite.accepted_by_sub = policy.user_sub
            await self.db_session.flush()
            return schemas.EventAccessInviteAcceptResponse(
                event_id=event.id,
                purpose=invite.purpose,
                action="transferred",
            )

        # co_view: reusable until expiry/revoke; mark first acceptor for audit
        await self.repo.add_attendee_viewer(
            event_id=event.id,
            user_sub=policy.user_sub,
            granted_by_sub=invite.created_by_sub,
        )
        if invite.accepted_at is None:
            invite.accepted_at = utc_now()
            invite.accepted_by_sub = policy.user_sub
            await self.db_session.flush()

        return schemas.EventAccessInviteAcceptResponse(
            event_id=event.id,
            purpose=invite.purpose,
            action="granted",
        )
