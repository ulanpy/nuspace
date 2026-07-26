import logging
from typing import Annotated

from aiogram import Bot
from aiogram.utils.deep_linking import create_start_link
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from redis.asyncio import Redis

from backend.common.request_url import request_app_base_url
from backend.core.configs.config import config
from backend.modules.auth import dependencies as deps
from backend.modules.auth.cookies import (
    set_app_token_cookie,
    set_kc_auth_cookies,
    unset_kc_auth_cookies,
)
from backend.modules.auth.dependencies import get_creds_or_401
from backend.modules.auth.schemas import CurrentUserResponse, Sub
from backend.modules.auth.service import AuthService

router = APIRouter(tags=["Auth Routes"])
logger = logging.getLogger(__name__)


@router.get("/login")
async def login(
    request: Request,
    auth_service: AuthService = Depends(deps.get_auth_service),
    redis: Redis = Depends(deps.get_redis),
    state: str | None = None,
    return_to: str | None = None,
    mock_user: str | None = "2",
    reauth: bool | None = None,
):
    app_base_url = request_app_base_url(request, config)
    state = await auth_service.ensure_login_state(redis, state, return_to, app_base_url)

    if config.MOCK_KEYCLOAK:
        return RedirectResponse(
            url=auth_service.build_mock_callback_url(app_base_url, state, mock_user),
            status_code=303,
        )

    response = await auth_service.get_authorize_redirect(request, state, app_base_url, reauth)
    if reauth:
        refresh_token = request.cookies.get(config.COOKIE_REFRESH_NAME)
        await auth_service.prepare_reauth(request, response, refresh_token)
    return response


@router.get("/auth/callback")
async def auth_callback(
    request: Request,
    auth_service: AuthService = Depends(deps.get_auth_service),
    redis: Redis = Depends(deps.get_redis),
    state: str | None = None,
):
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")
    code = request.query_params.get("code") or ""
    return await auth_service.complete_oauth_callback(request, redis, state, code)


@router.post("/connect-tg")
async def bind_tg(
    request: Request,
    sub_param: Sub,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    auth_service: AuthService = Depends(deps.get_auth_service),
):
    """Issue a Telegram deeplink binding the caller's own account to a chat."""
    # The sub is taken from the session, never from the request body, and the
    # endpoint requires a session at all. Both used to be untrue: it had no auth
    # dependency and trusted the body, while returning `correct_number` — the
    # answer to the emoji confirmation — in the same response. Subs are public
    # (every event and community response carries `creator.sub`), so anyone
    # could request a link for any account and bind their own Telegram to it,
    # quietly redirecting that user's notifications, SGotinish ticket updates
    # included.
    #
    # The body is still accepted so existing clients keep working, but a sub
    # that is not the caller's is refused rather than ignored: a client sending
    # someone else's is either stale or hostile, and both are worth surfacing.
    session_sub = user[0].get("sub")
    if sub_param.sub != session_sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot bind Telegram for another user",
        )

    bot: Bot = request.app.state.bot
    payload = auth_service.build_telegram_bind_payload(session_sub)
    link = await create_start_link(bot, payload["start_payload"], encode=True)
    return {
        "link": link,
        "correct_number": payload["correct_number"],
        "sub": payload["sub"],
    }


@router.post("/refresh-token", response_description="Refresh token")
async def refresh_token(
    response: Response,
    auth_service: AuthService = Depends(deps.get_auth_service),
    kc_refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
):
    if not kc_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No Keycloak refresh token provided",
        )

    try:
        new_kc_creds, new_app_claims, new_app_token_str = await auth_service.refresh_tokens(
            kc_refresh_token
        )
        set_kc_auth_cookies(response, new_kc_creds)
        set_app_token_cookie(
            response,
            new_app_token_str,
            auth_service.app_token_manager.token_expiry.total_seconds(),
        )
        return {**new_kc_creds, "app_token_claims": new_app_claims}
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to validate new Keycloak token: {exc}",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to refresh tokens: {exc}",
        ) from exc


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user(
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    auth_service: AuthService = Depends(deps.get_auth_service),
    extended: bool = False,
):
    kc_principal, app_principal = principals
    return await auth_service.get_current_user(kc_principal, app_principal)


# 204 with no body: the only thing this endpoint produces is Set-Cookie headers.
# It used to return the integer 200 as a JSON body, which said nothing and
# invited callers to read a result that was never meaningful.
@router.get("/logout", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def logout(
    response: Response,
    auth_service: AuthService = Depends(deps.get_auth_service),
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
):
    if refresh_token:
        try:
            await auth_service.logout(refresh_token)
        except Exception:
            # Remote revocation is desirable, but an unavailable identity
            # provider must not prevent the browser from ending its local
            # session. The short-lived access token will expire independently.
            logger.warning("Failed to revoke refresh token during logout", exc_info=True)

    unset_kc_auth_cookies(response)
    response.delete_cookie(key=config.COOKIE_APP_NAME)
