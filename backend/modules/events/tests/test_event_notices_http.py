"""Attendees hear on Telegram when an event is cancelled or moved (#446).

Over HTTP, with the bot faked at its client: `app.state.bot` is a recorder.
"""

from dataclasses import dataclass, field

import pytest
import pytest_asyncio
from aiogram.exceptions import TelegramForbiddenError
from aiogram.methods import SendMessage
from backend.modules.auth.models import User
from backend.tests.harness import Viewer
from fastapi import FastAPI
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

EVENTS_HOST = "https://events.nuspace.kz"
START = "2030-06-12T10:00:00+05:00"
END = "2030-06-12T12:00:00+05:00"

TG = {"member": 1001, "page_admin": 1002, "banned_member": 1003}


@dataclass
class Sent:
    chat_id: int
    text: str
    url: str


@dataclass
class FakeBot:
    sent: list[Sent] = field(default_factory=list)
    blocked: set[int] = field(default_factory=set)

    async def send_message(self, chat_id: int, text: str, **kwargs) -> None:
        if chat_id in self.blocked:
            raise TelegramForbiddenError(
                method=SendMessage(chat_id=chat_id, text=text), message="bot was blocked"
            )
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


async def edit(owner: Viewer, event_id: int, **fields) -> None:
    response = await owner.client.patch(f"/api/events/{event_id}", json=fields)
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_cancelling_dms_each_connected_attendee_with_an_events_button(
    owner: Viewer, member: Viewer, page_admin: Viewer, site_admin: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member, page_admin, site_admin)

    await edit(owner, event_id, status="cancelled")

    assert bot.chats == [TG["member"], TG["page_admin"]]
    for sent in bot.sent:
        assert "cancelled" in sent.text
        assert "Chess &lt;night&gt;" in sent.text
        assert sent.url == f"{EVENTS_HOST}/{event_id}"


@pytest.mark.asyncio
async def test_moving_the_start_dms_the_new_time(
    owner: Viewer, member: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await edit(owner, event_id, start_datetime="2030-06-13T15:30:00+05:00")

    (sent,) = bot.sent
    assert "13 Jun 2030, 15:30" in sent.text  # Asia/Almaty wall clock
    assert "New place" not in sent.text
    assert sent.url == f"{EVENTS_HOST}/{event_id}"


@pytest.mark.asyncio
async def test_moving_the_place_dms_the_new_place(
    owner: Viewer, member: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await edit(owner, event_id, place="Library & Lounge")

    (sent,) = bot.sent
    assert "New place: Library &amp; Lounge" in sent.text
    assert "New time" not in sent.text


@pytest.mark.asyncio
async def test_opting_out_stops_the_dms(
    owner: Viewer, member: Viewer, page_admin: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member, page_admin)

    off = await member.client.put("/api/users/me/event-notifications", json={"enabled": False})
    assert off.json() == {"enabled": False, "telegram_connected": True}
    await edit(owner, event_id, place="Library")

    assert bot.chats == [TG["page_admin"]]

    on = await member.client.put("/api/users/me/event-notifications", json={"enabled": True})
    assert on.json()["enabled"] is True
    await edit(owner, event_id, place="Gym")

    assert bot.chats == [TG["member"], TG["page_admin"], TG["page_admin"]]


@pytest.mark.asyncio
async def test_no_longer_attending_stops_the_dms(
    owner: Viewer, member: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)
    assert (await member.client.delete(f"/api/events/{event_id}/going")).status_code == 200

    await edit(owner, event_id, status="cancelled")

    assert bot.sent == []


@pytest.mark.asyncio
async def test_an_edit_that_changes_neither_time_place_nor_status_sends_nothing(
    owner: Viewer, member: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await edit(owner, event_id, description="Bring a board", name="Chess night")
    await edit(owner, event_id, place="Block 3", start_datetime=START)

    assert bot.sent == []


@pytest.mark.asyncio
async def test_a_failed_send_does_not_fail_the_update_or_the_other_sends(
    owner: Viewer, member: Viewer, page_admin: Viewer, telegram_linked, bot
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member, page_admin)
    bot.blocked.add(TG["member"])

    await edit(owner, event_id, status="cancelled")

    assert bot.chats == [TG["page_admin"]]
    event = await owner.client.get(f"/api/events/{event_id}")
    assert event.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_without_a_running_bot_the_update_still_succeeds(
    owner: Viewer, member: Viewer, telegram_linked
) -> None:
    event_id = await create_event(owner)
    await attend(event_id, member)

    await edit(owner, event_id, status="cancelled")


@pytest.mark.asyncio
async def test_event_notifications_default_on_and_report_telegram(
    member: Viewer, page_admin: Viewer, telegram_linked
) -> None:
    linked = await member.client.get("/api/users/me/event-notifications")
    assert linked.json() == {"enabled": True, "telegram_connected": True}


@pytest.mark.asyncio
async def test_event_notifications_without_telegram_report_not_connected(
    site_admin: Viewer,
) -> None:
    response = await site_admin.client.get("/api/users/me/event-notifications")
    assert response.json() == {"enabled": True, "telegram_connected": False}


@pytest.mark.asyncio
async def test_a_guest_cannot_read_or_change_event_notifications(guest: Viewer) -> None:
    assert (await guest.client.get("/api/users/me/event-notifications")).status_code == 401
    put = await guest.client.put("/api/users/me/event-notifications", json={"enabled": False})
    assert put.status_code == 401
