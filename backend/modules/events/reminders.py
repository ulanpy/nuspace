"""The 24h reminder (#447): each attendee of an approved event hears once, a day before it starts.

`send_due_reminders` is one pass. It claims the due attendees and stamps them
`reminded_at` in one transaction, then sends. A claimed row is never claimed
again, so a pass that crashes after the commit loses that reminder rather than
repeating it, and two passes that overlap skip each other's rows.

The pass runs as a Cloud Run Job every 15 minutes (`reminder_job`).
`run_reminders_once` is the same pass over an app's own state, for tests.
"""

from datetime import datetime, timedelta

from fastapi import FastAPI

from backend.common.datetime_utils import utc_now
from backend.core.database.uow import UnitOfWork
from backend.modules.bot.dependencies import build_direct_messenger
from backend.modules.events.interfaces import AttendeeMessenger
from backend.modules.events.models import Event
from backend.modules.events.notices import deliver, describe_reminder
from backend.modules.events.repository import EventRepository

REMINDER_WINDOW = timedelta(hours=24)


async def send_due_reminders(
    uow: UnitOfWork,
    messenger: AttendeeMessenger,
    events_origin: str,
    now: datetime,
) -> int:
    """Remind attendees of approved events starting within 24 hours of `now`; returns sends made."""
    async with uow:
        repo = uow.get_repo(EventRepository)
        claimed = await repo.claim_due_reminders(now=now, until=now + REMINDER_WINDOW)

    by_event: dict[int, tuple[Event, list[int]]] = {}
    for event, telegram_id, notifications_on in claimed:
        event_entry = by_event.setdefault(event.id, (event, []))
        if telegram_id is not None and notifications_on:
            event_entry[1].append(telegram_id)

    sent = 0
    for event, telegram_ids in by_event.values():
        if telegram_ids:
            sent += await deliver(
                messenger, events_origin, event.id, telegram_ids, describe_reminder(event)
            )
    return sent


async def run_reminders_once(app: FastAPI, now: datetime | None = None) -> int:
    """One pass over the app's database and bot; 0 when the bot is not running."""
    bot = getattr(app.state, "bot", None)
    if bot is None:
        return 0
    uow = UnitOfWork(session_factory=app.state.db_manager.get_session_maker())
    return await send_due_reminders(
        uow,
        build_direct_messenger(bot),
        app.state.config.service_origin("events"),
        now or utc_now(),
    )
