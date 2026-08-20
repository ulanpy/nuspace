from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from aiogram.types import Message
from backend.modules.bot.utils.telegram_event_album import (
    EVENT_ALBUM_TTL_SECONDS,
    cache_event_album_message,
    load_event_album_messages,
)
from backend.modules.bot.utils.telegram_event_payload import build_telegram_event_post_input


def _message(
    message_id: int,
    *,
    caption: str | None = None,
    media_group_id: str | None = None,
    from_user: bool = False,
) -> Message:
    payload = {
        "message_id": message_id,
        "date": datetime(2026, 8, 20, tzinfo=timezone.utc).isoformat(),
        "chat": {"id": 123, "type": "private"},
        "photo": [
            {
                "file_id": f"file-{message_id}",
                "file_unique_id": f"unique-{message_id}",
                "width": 100,
                "height": 100,
            }
        ],
    }
    if caption is not None:
        payload["caption"] = caption
    if media_group_id is not None:
        payload["media_group_id"] = media_group_id
    if from_user:
        payload["from"] = {"id": 456, "is_bot": False, "first_name": "Ulan"}
    return Message.model_validate(payload)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, dict[str, str]] = {}
        self.expirations: dict[str, int] = {}

    async def hset(self, key: str, field: str, value: str) -> None:
        self.values.setdefault(key, {})[field] = value

    async def expire(self, key: str, seconds: int) -> None:
        self.expirations[key] = seconds

    async def hgetall(self, key: str) -> dict[str, str]:
        return self.values.get(key, {})


@pytest.mark.asyncio
async def test_album_uses_caption_from_another_photo_and_keeps_order() -> None:
    redis = FakeRedis()
    first_photo = _message(10, media_group_id="album-1")
    captioned_photo = _message(
        11,
        caption="Workshop application deadline: 30 August",
        media_group_id="album-1",
    )
    await cache_event_album_message(redis, first_photo)
    await cache_event_album_message(redis, captioned_photo)

    album = await load_event_album_messages(
        redis,
        source_message=first_photo,
        bot=MagicMock(),
    )
    payload = build_telegram_event_post_input(
        command_message=_message(12, from_user=True),
        source_message=first_photo,
        album_messages=album,
    )

    assert [message.message_id for message in album] == [10, 11]
    assert payload.caption == "Workshop application deadline: 30 August"
    assert payload.media_file_unique_id == "unique-10"
    assert set(redis.expirations.values()) == {EVENT_ALBUM_TTL_SECONDS}
