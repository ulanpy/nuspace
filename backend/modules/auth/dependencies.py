from collections.abc import Callable, Coroutine
from typing import Annotated, Any

from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from jose import JWTError, jwt
from jwt import ExpiredSignatureError as PyJWTExpiredSignatureError
from redis.asyncio import Redis

from backend.common.dependencies import get_uow
from backend.core.configs.config import config
from backend.core.database.uow import UnitOfWork
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.cookies import set_app_token_cookie, set_kc_auth_cookies
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.mock import get_mock_user_by_sub
from backend.modules.auth.models import UserRole
from backend.modules.auth.service import AuthService


def set_request_access_actor(
    request: Request,
    *,
    user_sub: str | None = None,
    is_guest: bool = False,
    actor: str | None = None,
) -> None:
    """Attach identity fields for structured access logs (read by middleware)."""
    if user_sub is not None:
        request.state.user_sub = user_sub
    request.state.is_guest = is_guest
    if actor is not None:
        request.state.actor = actor


def mark_access_actor(
    actor: str,
    *,
    user_sub: str | None = None,
    is_guest: bool = False,
) -> Callable[[Request], Coroutine[Any, Any, None]]:
    """Depends factory for non-user callers (Pub/Sub, emulators, etc.)."""

    async def _dep(request: Request) -> None:
        set_request_access_actor(
            request,
            user_sub=user_sub,
            is_guest=is_guest,
            actor=actor,
        )

    return _dep


async def get_keycloak_manager(request: Request) -> KeyCloakManager:
    return request.app.state.kc_manager


async def get_app_token_manager(request: Request) -> AppTokenManager:
    return request.app.state.app_token_manager


async def get_redis(request: Request) -> Redis:
    return request.app.state.redis


async def get_auth_service(
    uow: UnitOfWork = Depends(get_uow),
    kc_manager: KeyCloakManager = Depends(get_keycloak_manager),
    app_token_manager: AppTokenManager = Depends(get_app_token_manager),
) -> AuthService:
    return AuthService(
        uow=uow,
        kc_manager=kc_manager,
        app_token_manager=app_token_manager,
    )


async def get_creds_or_401(
    request: Request,
    response: Response,
    kc_manager: KeyCloakManager = Depends(get_keycloak_manager),
    app_token_manager: AppTokenManager = Depends(get_app_token_manager),
    access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    app_token_cookie: Annotated[str | None, Cookie(alias=config.COOKIE_APP_NAME)] = None,
) -> tuple[dict, dict]:
    """
    Authenticates a user by validating Keycloak and application-specific tokens.

    Returns a tuple (kc_principal, app_principal).
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access and/or refresh token cookie(s)",
        )

    kc_principal: dict | None = None
    keycloak_token_refreshed = False

    if not access_token:
        try:
            new_kc_creds = await kc_manager.refresh_access_token(refresh_token)
            set_kc_auth_cookies(response, new_kc_creds)
            access_token = new_kc_creds["access_token"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to refresh Keycloak token: {str(e)}",
            ) from e

    if config.MOCK_KEYCLOAK:
        sub = access_token.removeprefix("mock_access_")
        u = get_mock_user_by_sub(sub)
        kc_principal = {
            "sub": u["sub"],
            "email": u["email"],
            "given_name": u["given_name"],
            "family_name": u["family_name"],
            "name": f"{u['given_name']} {u['family_name']}",
        }
    else:
        try:
            kc_principal = await kc_manager.validate_keycloak_token(access_token)
        except jwt.ExpiredSignatureError:
            try:
                new_kc_creds = await kc_manager.refresh_access_token(refresh_token)
                set_kc_auth_cookies(response, new_kc_creds)
                access_token = new_kc_creds["access_token"]
                kc_principal = await kc_manager.validate_keycloak_token(access_token)
                keycloak_token_refreshed = True
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Failed to refresh Keycloak token: {str(e)}",
                ) from e
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Keycloak token: {str(e)}",
            ) from e

    if not kc_principal:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not establish Keycloak principal.",
        )

    app_principal: dict | None = None
    issue_new_app_token = True

    if keycloak_token_refreshed:
        issue_new_app_token = True
    elif not app_token_cookie:
        issue_new_app_token = True
    else:
        try:
            app_principal = app_token_manager.validate_app_token(app_token_cookie)
            if app_principal.get("sub") != kc_principal.get("sub"):
                issue_new_app_token = True
            else:
                issue_new_app_token = False
        except PyJWTExpiredSignatureError:
            issue_new_app_token = True
        except JWTError:
            issue_new_app_token = True

    if issue_new_app_token:
        try:
            # A verified app token already carries the user claims needed by the
            # request.  Looking the user up on every request turned authentication
            # into a global DB-pool bottleneck under load.  Sync the user only when
            # issuing or refreshing that short-lived token.
            # Most protected reads carry a valid app token and never touch the
            # database. Allocate a UoW only for the rare refresh/issuance path
            # that actually needs a transaction.
            uow = UnitOfWork(
                session_factory=request.app.state.db_manager.get_session_maker()
            )
            auth_service = AuthService(uow, kc_manager, app_token_manager)
            await auth_service.ensure_user_from_access_token(access_token, kc_principal)
            new_app_token_str, new_app_claims = await app_token_manager.create_app_token(
                kc_principal["sub"], uow
            )
            set_app_token_cookie(
                response,
                new_app_token_str,
                app_token_manager.token_expiry.total_seconds(),
            )
            app_principal = new_app_claims
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating app token: {str(e)}")
            app_principal = {}

    if not app_principal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Application access denied: App token could not be established.",
        )

    set_request_access_actor(
        request,
        user_sub=kc_principal["sub"],
        is_guest=False,
        actor="user",
    )
    return kc_principal, app_principal


async def get_creds_or_guest(
    request: Request,
    response: Response,
    kc_manager: KeyCloakManager = Depends(get_keycloak_manager),
    app_token_manager: AppTokenManager = Depends(get_app_token_manager),
    access_token: Annotated[str | None, Cookie(alias=config.COOKIE_ACCESS_NAME)] = None,
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    app_token_cookie: Annotated[str | None, Cookie(alias=config.COOKIE_APP_NAME)] = None,
) -> tuple[dict, dict]:
    """Like get_creds_or_401, but returns guest principals when unauthenticated."""
    guest_kc = {"sub": "guest"}
    guest_app = {"role": UserRole.default.value, "communities": [], "is_guest": True}

    if not access_token or not refresh_token:
        set_request_access_actor(
            request,
            is_guest=True,
            actor="guest",
        )
        return guest_kc, guest_app

    try:
        return await get_creds_or_401(
            request=request,
            response=response,
            kc_manager=kc_manager,
            app_token_manager=app_token_manager,
            access_token=access_token,
            refresh_token=refresh_token,
            app_token_cookie=app_token_cookie,
        )
    except Exception:
        set_request_access_actor(
            request,
            is_guest=True,
            actor="guest",
        )
        return guest_kc, guest_app


async def check_tg(
    creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> bool:
    return await auth_service.ensure_telegram_linked(creds[0]["sub"])


async def check_role(
    creds: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> UserRole:
    return await auth_service.get_user_role_or_403(creds[0]["sub"])
