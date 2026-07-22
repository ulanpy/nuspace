from __future__ import annotations

from typing import Protocol

from backend.common.schemas import Infra
from backend.modules.campuscurrent.events import schemas as event_schemas


class EventCatalog(Protocol):
    async def get_events(
        self,
        user: tuple[dict, dict],
        event_filter: event_schemas.EventFilter,
        infra: Infra,
    ) -> event_schemas.ListEventResponse: ...
