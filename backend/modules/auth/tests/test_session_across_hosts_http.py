"""One sign-in covers every host, and sign-in returns you to where you started (#421).

Driven over HTTP through the mock Keycloak login: `/api/login` redirects
straight to `/api/auth/callback`, which sets the cookies and redirects back.
Redis is the one boundary these routes reach that the harness leaves real, so
each test swaps in `FakeRedis` on `app.state`.
"""

from http.cookies import SimpleCookie
from urllib.parse import urlsplit

import httpx
import pytest
from backend.core.configs.config import config
from backend.tests.harness import Viewer
from fastapi import FastAPI

AUTH_COOKIES = (config.COOKIE_ACCESS_NAME, config.COOKIE_REFRESH_NAME, config.COOKIE_APP_NAME)


class FakeRedis:
    """The four commands the login round-trip uses, in memory."""

    def __init__(self) -> None:
        self.store: dict[str, str] = {}

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.store[key] = value

    async def get(self, key: str) -> str | None:
        return self.store.get(key)

    async def delete(self, key: str) -> None:
        self.store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return key in self.store


@pytest.fixture
def redis(app: FastAPI, monkeypatch: pytest.MonkeyPatch) -> FakeRedis:
    fake = FakeRedis()
    monkeypatch.setattr(app.state, "redis", fake)
    return fake


def _set_cookies(response: httpx.Response) -> dict[str, list]:
    """Every `Set-Cookie` on a response, by cookie name (a name may be set twice)."""
    cookies: dict[str, list] = {}
    for header in response.headers.get_list("set-cookie"):
        cookie = SimpleCookie()
        cookie.load(header)
        for name, morsel in cookie.items():
            cookies.setdefault(name, []).append(morsel)
    return cookies


async def _sign_in(client: httpx.AsyncClient, url: str, **kwargs) -> httpx.Response:
    """Start a login at `url` and follow it to the callback; return the callback's response."""
    login = await client.get(url, **kwargs)
    assert login.status_code == 303
    return await client.get(login.headers["location"])


@pytest.mark.asyncio
async def test_sign_in_sets_every_cookie_on_the_parent_domain(
    guest: Viewer, redis: FakeRedis
) -> None:
    callback = await _sign_in(guest.client, "https://events.nuspace.kz/api/login")

    assert callback.status_code == 303
    cookies = _set_cookies(callback)
    for name in AUTH_COOKIES:
        (morsel,) = cookies[name]
        assert morsel["domain"] == ".nuspace.kz"
        assert morsel["samesite"] == "Lax"
        assert morsel["httponly"] is True
        assert morsel["secure"] is True
    assert cookies[config.COOKIE_APP_NAME][0]["max-age"] == "300"


@pytest.mark.asyncio
async def test_signing_in_on_one_host_signs_you_in_on_another(
    guest: Viewer, redis: FakeRedis
) -> None:
    await _sign_in(guest.client, "https://events.nuspace.kz/api/login")

    response = await guest.client.get("https://pages.nuspace.kz/api/me")

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_sign_in_returns_to_the_host_and_path_it_started_on(
    guest: Viewer, redis: FakeRedis
) -> None:
    login = await guest.client.get(
        "https://events.nuspace.kz/api/login", params={"return_to": "/123"}
    )

    assert urlsplit(login.headers["location"]).netloc == "events.nuspace.kz"
    callback = await guest.client.get(login.headers["location"])
    assert callback.headers["location"] == "https://events.nuspace.kz/123"


@pytest.mark.asyncio
async def test_an_absolute_return_to_is_not_followed(guest: Viewer, redis: FakeRedis) -> None:
    callback = await _sign_in(
        guest.client,
        "https://events.nuspace.kz/api/login",
        params={"return_to": "https://evil.example/steal"},
    )

    assert callback.headers["location"] == "https://events.nuspace.kz"


@pytest.mark.asyncio
async def test_a_client_supplied_forwarded_host_is_ignored(guest: Viewer, redis: FakeRedis) -> None:
    login = await guest.client.get(
        "https://events.nuspace.kz/api/login",
        params={"return_to": "/123"},
        headers={"X-Forwarded-Host": "evil.example"},
    )

    assert urlsplit(login.headers["location"]).netloc == "events.nuspace.kz"
    callback = await guest.client.get(login.headers["location"])
    assert callback.headers["location"] == "https://events.nuspace.kz/123"


@pytest.mark.asyncio
async def test_an_unknown_host_falls_back_to_the_apex(guest: Viewer, redis: FakeRedis) -> None:
    login = await guest.client.get("https://evil.example/api/login", params={"return_to": "/123"})

    location = urlsplit(login.headers["location"])
    assert (location.scheme, location.netloc) == ("https", "nuspace.kz")
    callback = await guest.client.get(login.headers["location"])
    assert callback.headers["location"] == "https://nuspace.kz/123"


@pytest.mark.asyncio
async def test_sign_out_deletes_every_cookie_from_the_parent_domain(member: Viewer) -> None:
    response = await member.client.get("https://courses.nuspace.kz/api/logout")

    assert response.status_code == 200
    cookies = _set_cookies(response)
    for name in AUTH_COOKIES:
        deletions = {morsel["domain"]: morsel for morsel in cookies[name]}
        # The parent-domain cookie, and any host-only one set before the cutover.
        assert set(deletions) == {".nuspace.kz", ""}
        for morsel in deletions.values():
            assert morsel.value == ""
            assert morsel["max-age"] == "0"


@pytest.mark.asyncio
async def test_after_sign_out_no_host_is_signed_in(guest: Viewer, redis: FakeRedis) -> None:
    await _sign_in(guest.client, "https://events.nuspace.kz/api/login")
    assert (await guest.client.get("https://pages.nuspace.kz/api/me")).status_code == 200

    await guest.client.get("https://courses.nuspace.kz/api/logout")

    for host in ("nuspace.kz", "events.nuspace.kz", "pages.nuspace.kz"):
        assert (await guest.client.get(f"https://{host}/api/me")).status_code == 401
