"""Telegram notices to the people attending an event.

`describe_change` decides whether an edit is worth a notice and words it.
`describe_reminder` words the 24h reminder (#447).
`deliver` is the reusable send: any text, any recipients, one button to the
event on the events host. `EventNotifier.notify` queues it after a request;
the reminder job awaits it directly.
"""

import html
import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import datetime

from backend.common.datetime_utils import CAMPUS_TZ
from backend.modules.events.interfaces import AttendeeMessenger
from backend.modules.events.models import Event, EventStatus

logger = logging.getLogger(__name__)

BUTTON_LABEL = "Open event"


@dataclass(frozen=True)
class EventSnapshot:
    """The fields of an event an edit can change in a way attendees care about."""

    status: EventStatus
    start_datetime: datetime
    place: str

    @classmethod
    def of(cls, event: Event) -> "EventSnapshot":
        return cls(status=event.status, start_datetime=event.start_datetime, place=event.place)


def _when(value: datetime) -> str:
    return value.astimezone(CAMPUS_TZ).strftime("%a %d %b %Y, %H:%M")


def describe_change(before: EventSnapshot, event: Event) -> str | None:
    """HTML body of the notice an edit calls for, or None when attendees need not hear."""
    name = html.escape(event.name)
    if before.status != EventStatus.cancelled and event.status == EventStatus.cancelled:
        return f"<b>Event cancelled</b>\n{name} has been cancelled."

    if before.status != EventStatus.approved or event.status != EventStatus.approved:
        return None
    lines = []
    if event.start_datetime != before.start_datetime:
        lines.append(f"New time: {_when(event.start_datetime)}")
    if event.place != before.place:
        lines.append(f"New place: {html.escape(event.place)}")
    if not lines:
        return None
    return "\n".join([f"<b>Event updated</b>\n{name}", *lines])


def describe_reminder(event: Event) -> str:
    """HTML body of the reminder sent 24 hours before an approved event starts."""
    return "\n".join(
        [
            f"<b>Event tomorrow</b>\n{html.escape(event.name)} starts within 24 hours.",
            f"Time: {_when(event.start_datetime)}",
            f"Place: {html.escape(event.place)}",
        ]
    )


async def deliver(
    messenger: AttendeeMessenger,
    events_origin: str,
    event_id: int,
    telegram_ids: Sequence[int],
    text: str,
) -> int:
    """Send `text` to each chat with the events-host button; returns how many went out."""
    url = f"{events_origin.rstrip('/')}/{event_id}"
    sent = 0
    for telegram_id in telegram_ids:
        try:
            if await messenger.send(telegram_id, text, button_label=BUTTON_LABEL, button_url=url):
                sent += 1
        except Exception:
            logger.exception("Event %s notice to chat %s failed", event_id, telegram_id)
    logger.info("Event %s notice: %s of %s delivered", event_id, sent, len(telegram_ids))
    return sent


class EventNotifier:
    """DMs a text to people with a button to an event, after the request has answered.

    `schedule` runs the sends later (FastAPI's `BackgroundTasks.add_task`), so a
    long attendee list never holds the response and a failure never fails it.
    """

    def __init__(
        self,
        messenger: AttendeeMessenger,
        events_origin: str,
        schedule: Callable[..., None],
    ) -> None:
        self.messenger = messenger
        self.events_origin = events_origin.rstrip("/")
        self.schedule = schedule

    def notify(self, event_id: int, telegram_ids: Sequence[int], text: str) -> None:
        if not telegram_ids:
            return
        self.schedule(self._send_all, event_id, list(telegram_ids), text)

    async def _send_all(self, event_id: int, telegram_ids: list[int], text: str) -> None:
        await deliver(self.messenger, self.events_origin, event_id, telegram_ids, text)
