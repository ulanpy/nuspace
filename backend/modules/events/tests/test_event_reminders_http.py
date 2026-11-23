"""Attendees get one Telegram reminder 24 hours before an event (#447).

Over HTTP for setup, with the bot faked at its client: `app.state.bot` is a
recorder, and the reminder pass runs against the app's own database and config.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta

import pytest
import pytest_asyncio
from backend.modules.auth.models import User
from backend.modules.events.reminders import run_reminders_once
from backend.tests.harness import Viewer
from fastapi import FastAPI
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

EVENTS_HOST = "https://events.nuspace.kz"
START = "2030-06-12T10:00:00+05:00"
END = "2030-06-12T12:00:00+05:00"
TWO_HOURS_BEFORE = datetime.fromisoformat(START) - timedelta(hours=2)

TG = {"member": 1001, "page_admin": 1002, "site_admin": 1003}


@dataclass
class Sent:
    chat_id: int
    text: str
    url: str


@dataclass
class FakeBot:
    sent: list[Sent] = field(default_factory=list)

    async def send_message(self, chat_id: int, text: str, **kwargs) -> None:
        (button,) = kwargs["reply_markup"].inline_keyboard[0]
        self.sent.append(Sent(chat_id=chat_id, text=text, url=button.url))

    @property
    def chats(self) -> list[int]:
        return sorted(sent.chat_id for sent in self.sent)


@pytest.fixture
def bot(app: FastAPI, monkeypatch: pytest.MonkeyPatch) -> FakeBot:
    fake = FakeBot()
    monkeypatch.setattr(app.state, "bot", fake)
    return fake


@pytest_asyncio.fixture
async def telegram_linked(
    db: async_sessionmaker[AsyncSession], member: Viewer, page_admin: Viewer
) -> None:
    """`member` and `page_admin` connected Telegram; `site_admin` never did."""
    async with db.begin() as session:
        for viewer in (member, page_admin):
            await session.execute(
                update(User).where(User.sub == viewer.sub).values(telegram_id=TG[viewer.kind])
            )


async def create_event(owner: Viewer) -> int:
    response = await owner.client.post(
        "/api/events",
        json={
            "creator_sub": "me",
            "policy": "open",
            "name": "Chess <night>",
            "place": "Block 3",
            "start_datetime": START,
            "end_datetime": END,
            "description": "Play",
            "type": "social",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()["id"]


async def attend(event_id: int, *viewers: Viewer) -> None:
    for viewer in viewers:
        response = await viewer.client.put(f"/api/events/{event_id}/going")
        assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_the_reminder_is_sent_once_and_never_twice(
    app: FastAPI, owner: Viewer, member: Viewer, telegram_linked, bot: FakeBot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await run_reminders_once(app, now=TWO_HOURS_BEFORE)
    await run_reminders_once(app, now=TWO_HOURS_BEFORE + timedelta(minutes=15))

    (sent,) = bot.sent
    assert sent.chat_id == TG["member"]
    assert "starts within 24 hours" in sent.text
    assert "Chess &lt;night&gt;" in sent.text
    assert sent.url == f"{EVENTS_HOST}/{event_id}"


@pytest.mark.asyncio
async def test_opted_out_unattended_and_telegram_less_attendees_get_nothing(
    app: FastAPI,
    owner: Viewer,
    member: Viewer,
    page_admin: Viewer,
    site_admin: Viewer,
    telegram_linked,
    bot: FakeBot,
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member, site_admin)
    off = await member.client.put("/api/users/me/event-notifications", json={"enabled": False})
    assert off.status_code == 200, off.text

    await run_reminders_once(app, now=TWO_HOURS_BEFORE)

    assert bot.sent == []


@pytest.mark.asyncio
async def test_only_events_starting_within_24_hours_are_reminded(
    app: FastAPI, owner: Viewer, member: Viewer, telegram_linked, bot: FakeBot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await run_reminders_once(app, now=TWO_HOURS_BEFORE - timedelta(hours=24))
    assert bot.sent == []

    await run_reminders_once(app, now=TWO_HOURS_BEFORE)
    (sent,) = bot.sent
    assert sent.url == f"{EVENTS_HOST}/{event_id}"
