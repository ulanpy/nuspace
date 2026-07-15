from __future__ import annotations

from typing import List, Protocol, Tuple


class CalendarEventSync(Protocol):
    async def sync_events(
        self,
        *,
        desired_events: List[dict],
        kc_access_token: str | None,
        kc_refresh_token: str | None,
    ) -> Tuple[int, int, int, List[str]]: ...
