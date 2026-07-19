"""Bot-owned ports for Telegram → Event posting."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from backend.core.database.models.events import EventType, RegistrationPolicy
from backend.modules.bot.schemas.event_post import ExtractedEventDraft


class EventDraftExtractor(Protocol):
    """Extract structured event fields from free-form Telegram caption/text."""

    async def extract_event_draft(
        self,
        *,
        caption: str,
        link_urls: list[str] | None = None,
        user_id: str | None = None,
    ) -> ExtractedEventDraft: ...


class CampusEventPublisher(Protocol):
    """Create a personal campus event for a linked NU user."""

    async def publish_personal_event(
        self,
        *,
        creator_sub: str,
        name: str,
        place: str,
        start_datetime: datetime,
        end_datetime: datetime,
        description: str,
        event_type: EventType,
        policy: RegistrationPolicy,
        registration_link: str | None = None,
        image_bytes: bytes | None = None,
        image_mime_type: str | None = None,
    ) -> int:
        """Return created event id. Optionally attach a carousel image."""
        ...
