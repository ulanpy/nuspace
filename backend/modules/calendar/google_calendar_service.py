from __future__ import annotations

import asyncio
from typing import List, Tuple, Dict, Any

import httpx

from backend.modules.auth.keycloak_manager import KeyCloakManager


class GoogleCalendarService:
    def __init__(
        self,
        kc_manager: KeyCloakManager,
        *,
        calendar_id: str = "primary",
        timeout: float = 20.0,
    ):
        self.kc_manager = kc_manager
        self.calendar_id = calendar_id
        self.timeout = timeout

    async def _fetch_google_token(
        self, kc_access_token: str | None, kc_refresh_token: str | None
    ) -> str:
        """
        Retrieve (and refresh, if needed) Google access token via Keycloak token-exchange.
        """
        broker_access_token = kc_access_token
        if not broker_access_token and kc_refresh_token:
            refreshed = await self.kc_manager.refresh_access_token(kc_refresh_token)
            broker_access_token = refreshed.get("access_token")

        if not broker_access_token:
            raise ValueError("Keycloak access token missing; cannot fetch Google token")

        try:
            google_token = await self.kc_manager.exchange_token_for_idp(
                broker_access_token,
                requested_issuer="google",
            )
        except httpx.HTTPStatusError as exc:
            # If KC access token is stale, refresh KC then retry exchange once
            if exc.response.status_code in (401, 403) and kc_refresh_token:
                refreshed = await self.kc_manager.refresh_access_token(kc_refresh_token)
                broker_access_token = refreshed.get("access_token")
                google_token = await self.kc_manager.exchange_token_for_idp(
                    broker_access_token,
                    requested_issuer="google",
                )
            elif exc.response.status_code == 400 and exc.response is not None:
                detail = exc.response.text
                raise ValueError(f"Google token exchange failed: {detail}") from exc
            else:
                raise

        google_access_token = (google_token or {}).get("access_token")
        if not google_access_token:
            raise ValueError("Google access token not found in token exchange response")
        return google_access_token

    async def _list_events(self, token: str) -> List[dict]:
        events: List[dict] = []
        page_token = None
        params = {
            "privateExtendedProperty": "source=nuros_schedule",
            "showDeleted": "false",
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            while True:
                q = dict(params)
                if page_token:
                    q["pageToken"] = page_token
                resp = await client.get(
                    f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events",
                    headers={"Authorization": f"Bearer {token}"},
                    params=q,
                )
                resp.raise_for_status()
                data = resp.json()
                items = data.get("items", []) or []
                events.extend(items)
                page_token = data.get("nextPageToken")
                if not page_token:
                    break
        return events

    async def push_events(
        self,
        *,
        events: List[dict],
        kc_access_token: str | None,
        kc_refresh_token: str | None,
    ) -> Tuple[int, List[str]]:
        """
        Push events to Google Calendar using token exchange for Google access token.
        Returns (created_count, google_errors).
        """
        google_access_token = await self._fetch_google_token(kc_access_token, kc_refresh_token)
        created = 0
        google_errors: List[str] = []

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async def push_event(event: dict, token: str):
                response = await client.post(
                    f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events",
                    headers={"Authorization": f"Bearer {token}"},
                    json=event,
                )
                if response.status_code == 403 and "insufficient" in response.text.lower():
                    raise httpx.HTTPStatusError(
                        "google_scope_missing",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()

            async def push_all(token: str):
                return await asyncio.gather(
                    *(push_event(event, token) for event in events), return_exceptions=True
                )

            push_results = await push_all(google_access_token)

            # If we hit Google 401/403, re-fetch via token exchange and retry once
            if any(
                isinstance(res, httpx.HTTPStatusError)
                and res.response.status_code in (401, 403)
                for res in push_results
            ):
                if any(
                    isinstance(res, httpx.HTTPStatusError)
                    and res.response.status_code == 403
                    and "google_scope_missing" in str(res)
                    for res in push_results
                ):
                    return created, ["insufficient_google_scope"]
                google_access_token = await self._fetch_google_token(kc_access_token, kc_refresh_token)
                push_results = await push_all(google_access_token)

        for result in push_results:
            if isinstance(result, Exception):
                google_errors.append(str(result))
            else:
                created += 1

        return created, google_errors

    async def sync_events(
        self,
        *,
        desired_events: List[dict],
        kc_access_token: str | None,
        kc_refresh_token: str | None,
    ) -> Tuple[int, int, int, List[str]]:
        """
        Reconcile Google calendar events for source=nuros_schedule:
        - Insert missing
        - Update changed
        - Delete stale
        """
        token = await self._fetch_google_token(kc_access_token, kc_refresh_token)
        google_errors: List[str] = []
        created = updated = deleted = 0

        def _key_of(ev: dict) -> str | None:
            return (
                ev.get("extendedProperties", {})
                .get("private", {})
                .get("nuros_event_key")
            )

        def _needs_update(current: dict, desired: dict) -> bool:
            fields = ["summary", "description", "start", "end", "recurrence", "location"]
            for f in fields:
                if current.get(f) != desired.get(f):
                    return True
            # compare private props except etag/id
            cur_p = current.get("extendedProperties", {}).get("private", {}) or {}
            des_p = desired.get("extendedProperties", {}).get("private", {}) or {}
            return cur_p != des_p

        try:
            existing = await self._list_events(token)
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 403:
                return created, updated, deleted, ["insufficient_google_scope"]
            return created, updated, deleted, [str(exc)]
        except Exception as exc:
            return created, updated, deleted, [str(exc)]

        existing_map: Dict[str, dict] = {}
        for ev in existing:
            k = _key_of(ev)
            if k:
                existing_map[k] = ev

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async def insert(ev: dict):
                resp = await client.post(
                    f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events",
                    headers={"Authorization": f"Bearer {token}"},
                    json=ev,
                )
                if resp.status_code == 403:
                    raise httpx.HTTPStatusError("google_scope_missing", request=resp.request, response=resp)
                resp.raise_for_status()

            async def update(ev_id: str, ev: dict):
                resp = await client.patch(
                    f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events/{ev_id}",
                    headers={"Authorization": f"Bearer {token}"},
                    json=ev,
                )
                if resp.status_code == 403:
                    raise httpx.HTTPStatusError("google_scope_missing", request=resp.request, response=resp)
                resp.raise_for_status()

            async def delete(ev_id: str):
                resp = await client.delete(
                    f"https://www.googleapis.com/calendar/v3/calendars/{self.calendar_id}/events/{ev_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                # Google returns 204; ignore 404 in case already gone
                if resp.status_code == 403:
                    raise httpx.HTTPStatusError("google_scope_missing", request=resp.request, response=resp)
                if resp.status_code not in (200, 204, 404):
                    resp.raise_for_status()

            insert_tasks = []
            update_tasks = []
            delete_tasks = []

            desired_map: Dict[str, dict] = {}
            for ev in desired_events:
                k = _key_of(ev)
                if not k:
                    continue
                desired_map[k] = ev
                if k in existing_map:
                    current = existing_map[k]
                    if _needs_update(current, ev):
                        update_tasks.append((current.get("id"), ev))
                else:
                    insert_tasks.append(ev)

            # stale events
            for k, cur_ev in existing_map.items():
                if k not in desired_map:
                    delete_tasks.append(cur_ev.get("id"))

            # Run insert/update/delete
            if insert_tasks:
                results = await asyncio.gather(
                    *(insert(ev) for ev in insert_tasks), return_exceptions=True
                )
                for r in results:
                    if isinstance(r, httpx.HTTPStatusError) and r.response.status_code == 403:
                        return created, updated, deleted, ["insufficient_google_scope"]
                    if isinstance(r, Exception):
                        google_errors.append(str(r))
                    else:
                        created += 1

            if update_tasks:
                results = await asyncio.gather(
                    *(update(ev_id, ev) for ev_id, ev in update_tasks),
                    return_exceptions=True,
                )
                for r in results:
                    if isinstance(r, httpx.HTTPStatusError) and r.response.status_code == 403:
                        return created, updated, deleted, ["insufficient_google_scope"]
                    if isinstance(r, Exception):
                        google_errors.append(str(r))
                    else:
                        updated += 1

            if delete_tasks:
                results = await asyncio.gather(
                    *(delete(ev_id) for ev_id in delete_tasks), return_exceptions=True
                )
                for r in results:
                    if isinstance(r, httpx.HTTPStatusError) and r.response.status_code == 403:
                        return created, updated, deleted, ["insufficient_google_scope"]
                    if isinstance(r, Exception):
                        google_errors.append(str(r))
                    else:
                        deleted += 1

        return created, updated, deleted, google_errors
