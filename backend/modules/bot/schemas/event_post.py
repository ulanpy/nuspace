from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from backend.modules.campuscurrent.models.events import (
    EventBotSubmissionStatus,
    EventType,
    RegistrationPolicy,
)


class ExtractedEventDraft(BaseModel):
    """Structured event fields returned by the LLM from a Telegram post."""

    name: str | None = None
    place: str | None = None
    start_datetime: datetime | None = None
    end_datetime: datetime | None = None
    description: str | None = None
    type: EventType | None = None
    policy: RegistrationPolicy | None = RegistrationPolicy.open
    registration_link: str | None = None
    missing_fields: list[str] = Field(default_factory=list)
    reject: bool = False
    reject_reason: str | None = None

    @property
    def is_complete(self) -> bool:
        required = ("name", "place", "start_datetime", "end_datetime", "description", "type")
        return not self.reject and all(getattr(self, key) is not None for key in required)


class TelegramEventPostInput(BaseModel):
    """Normalized Telegram message payload for /post."""

    submitter_telegram_id: int
    bot_chat_id: int
    bot_message_id: int
    caption: str | None = None
    link_urls: list[str] = Field(default_factory=list)
    origin_type: str | None = None
    origin_chat_id: int | None = None
    origin_message_id: int | None = None
    forward_date: datetime | None = None
    forward_sender_name: str | None = None
    media_file_unique_id: str | None = None
    raw_payload: dict[str, Any] | None = None


class EventPostResult(BaseModel):
    submission_id: int
    status: EventBotSubmissionStatus
    event_id: int | None = None
    draft: ExtractedEventDraft | None = None
    message: str
