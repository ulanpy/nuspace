from __future__ import annotations

from typing import Protocol

from backend.modules.campuscurrent.events import schemas as event_schemas


class EventCatalog(Protocol):
    async def get_events(
        self,
        user: tuple[dict, dict],
        event_filter: event_schemas.EventFilter,
    ) -> event_schemas.ListEventResponse: ...
