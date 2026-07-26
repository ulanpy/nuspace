from unittest.mock import AsyncMock

import pytest
from backend.core.configs.config import config
from backend.modules.auth.api import login, logout
from fastapi import Response
from fastapi.responses import RedirectResponse
from starlette.requests import Request


def request_with_cookies(cookies: dict[str, str] | None = None) -> Request:
    cookie_header = "; ".join(f"{name}={value}" for name, value in (cookies or {}).items())
    headers = [(b"host", b"localhost")]
    if cookie_header:
        headers.append((b"cookie", cookie_header.encode()))
    return Request(
        {
            "type": "http",
            "scheme": "http",
            "method": "GET",
            "path": "/api/login",
            "query_string": b"",
            "headers": headers,
            "server": ("localhost", 80),
            "client": ("127.0.0.1", 1234),
        }
    )


@pytest.mark.asyncio
async def test_reauthentication_clears_cookies_on_authorize_response(monkeypatch):
    from backend.modules.auth import api

    monkeypatch.setattr(api.config, "MOCK_KEYCLOAK", False)
    auth_service = AsyncMock()
    auth_service.ensure_login_state.return_value = "state"
    authorize_response = RedirectResponse("https://identity.example/login")
    auth_service.get_authorize_redirect.return_value = authorize_response
    redis = AsyncMock()
    request = request_with_cookies({config.COOKIE_REFRESH_NAME: "refresh-token"})

    result = await login(
        request=request,
        auth_service=auth_service,
        redis=redis,
        reauth=True,
    )

    assert result is authorize_response
    auth_service.prepare_reauth.assert_awaited_once_with(
        request, authorize_response, "refresh-token"
    )


@pytest.mark.asyncio
async def test_logout_without_refresh_token_still_clears_local_cookies():
    response = Response()
    auth_service = AsyncMock()

    result = await logout(
        response=response,
        auth_service=auth_service,
        refresh_token=None,
    )

    assert result is None
    auth_service.logout.assert_not_awaited()
    deleted_cookies = response.headers.getlist("set-cookie")
    assert any(cookie.startswith(f"{config.COOKIE_ACCESS_NAME}=") for cookie in deleted_cookies)
    assert any(cookie.startswith(f"{config.COOKIE_REFRESH_NAME}=") for cookie in deleted_cookies)
    assert any(cookie.startswith(f"{config.COOKIE_APP_NAME}=") for cookie in deleted_cookies)


@pytest.mark.asyncio
async def test_logout_clears_local_cookies_when_remote_revocation_fails():
    response = Response()
    auth_service = AsyncMock()
    auth_service.logout.side_effect = RuntimeError("identity provider unavailable")

    result = await logout(
        response=response,
        auth_service=auth_service,
        refresh_token="refresh-token",
    )

    assert result is None
    auth_service.logout.assert_awaited_once_with("refresh-token")
    assert len(response.headers.getlist("set-cookie")) == 3
