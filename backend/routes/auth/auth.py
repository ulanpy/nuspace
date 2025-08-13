import json
import logging
import random
import secrets
from typing import Annotated

from aiogram import Bot
from aiogram.utils.deep_linking import create_start_link
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.configs.config import config
from backend.routes.auth.app_token import AppTokenManager
from backend.routes.auth.keycloak_manager import KeyCloakManager
from backend.routes.auth.schemas import CurrentUserResponse, Sub

from .cruds import User, upsert_user
from .schemas import UserSchema
from .utils import (
    create_user_schema,
    exchange_code_for_credentials,
    set_kc_auth_cookies,
    unset_kc_auth_cookies,
)

router = APIRouter(tags=["Auth Routes"])

# /login: always pass a state
@router.get("/login")
async def login(request: Request, state: str | None = None, return_to: str | None = None):
    kc: KeyCloakManager = request.app.state.kc_manager
    redis = request.app.state.redis

    # If no state provided (normal web), create CSRF state
    if not state:
        state = secrets.token_urlsafe(32)
        csrf_key = f"csrf:{state}"
        # Optionally: await redis.set(csrf_key, return_to or "/", ex=600, nx=True)
        await redis.setex(csrf_key, 600, return_to or "/")

    return await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_redirect(
        request,
        kc.KEYCLOAK_REDIRECT_URI,
        state=state,
    )


# /auth/callback: require and validate state
@router.get("/auth/callback")
async def auth_callback(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
    creds: dict = Depends(exchange_code_for_credentials),
    state: str | None = None,
):
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager
    redis = request.app.state.redis

    # Validate Keycloak token from the fresh exchange
    try:
        await kc_manager.validate_keycloak_token(creds["access_token"])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Keycloak token after code exchange: {str(e)}")

    # Upsert user and mint app token
    user_schema: UserSchema = await create_user_schema(creds)
    user: User = await upsert_user(db_session, user_schema)
    app_token_str, _claims = await app_token_manager.create_app_token(user.sub, db_session)

    # Prepare base redirect and cookies
    redirect_response = RedirectResponse(url=config.HOME_URL, status_code=303)
    set_kc_auth_cookies(redirect_response, creds)
    redirect_response.set_cookie(
        key=config.COOKIE_APP_NAME,
        value=app_token_str,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=app_token_manager.token_expiry.total_seconds(),
    )

    # 1) MiniApp flow: state must exist in MiniApp space
    miniapp_state_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}{state}"
    creds_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}creds:{state}"
    miniapp_exists = await redis.get(miniapp_state_key)

    if miniapp_exists:
        try:
            # Store minimal creds needed; TTL prevents long exposure
            await redis.setex(creds_key, 300, json.dumps({
                "access_token": creds.get("access_token"),
                "refresh_token": creds.get("refresh_token"),
                "id_token": creds.get("id_token"),
            }))
        finally:
            await redis.delete(miniapp_state_key)

        ua = (request.headers.get("user-agent") or "").lower()
        is_mobile = any(s in ua for s in ["iphone", "ipad", "ipod", "android", "mobile", "windows phone"])
        if is_mobile:
            if not getattr(config, "TG_APP_PATH", None) or str(config.TG_APP_PATH).lower() == "startapp":
                tme_url = f"https://t.me/{config.BOT_USERNAME}?startapp={state}"
            else:
                tme_url = f"https://t.me/{config.BOT_USERNAME}/{config.TG_APP_PATH}?startapp={state}"
            return RedirectResponse(url=tme_url, status_code=303)
        return redirect_response

    # 2) Web flow: validate CSRF state and consume it
    csrf_key = f"csrf:{state}"
    csrf_return_to = await redis.get(csrf_key)
    if csrf_return_to is not None:
        await redis.delete(csrf_key)
        # Optional: validate return_to against a whitelist to prevent open redirects
        return redirect_response

    # 3) Neither MiniApp nor CSRF state is valid → reject
    raise HTTPException(status_code=400, detail="Invalid or expired state")


@router.post("/connect-tg")
async def bind_tg(request: Request, sub_param: Sub):
    bot: Bot = request.app.state.bot
    sub_value = sub_param.sub
    correct_number = random.randrange(1, 10)
    link = await create_start_link(bot, f"{sub_value}&{correct_number}", encode=True)
    return {"link": link, "correct_number": correct_number, "sub": sub_value}


@router.get("/miniapp/login/init")
async def miniapp_login_init(
    request: Request, return_to: str | None = None
):
    """
    Initialize a Mini App login by generating a one-time state code and returning
    the external login URL that must be opened in a system browser.
    """
    code = secrets.token_urlsafe(24)
    redis = request.app.state.redis
    state_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}{code}"
    try:
        await redis.setex(state_key, 300, return_to or "/")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not initialize miniapp login",
        )

    login_url = f"{config.HOME_URL}/api/login?state={code}"
    return {"code": code, "login_url": login_url}


@router.post("/miniapp/login/exchange")
async def miniapp_login_exchange(
    request: Request,
    response: Response,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Exchange a Mini App one-time code for cookies. Sets Keycloak cookies and issues
    a fresh app token. Intended to be called from the Mini App webview with credentials included.
    Returns 200 when cookies are set.
    """
    redis = request.app.state.redis
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON body")

    code = (payload or {}).get("code")
    if not code:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code")

    creds_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}creds:{code}"
    raw_creds = await redis.get(creds_key)
    if not raw_creds:
        # Not ready yet
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not ready")

    try:
        creds = json.loads(raw_creds)
    except Exception:
        await redis.delete(creds_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Corrupted credentials"
        )

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager

    # Validate KC token
    try:
        await kc_manager.validate_keycloak_token(creds["access_token"])
    except JWTError as e:
        await redis.delete(creds_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Keycloak token: {str(e)}"
        )

    # Upsert user and set cookies
    user_schema: UserSchema = await create_user_schema(creds)
    user: User = await upsert_user(db_session, user_schema)

    # Set KC cookies
    set_kc_auth_cookies(response, creds)

    # Issue app token
    new_app_token_str, _claims = await app_token_manager.create_app_token(user.sub, db_session)
    response.set_cookie(
        key=config.COOKIE_APP_NAME,
        value=new_app_token_str,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=app_token_manager.token_expiry.total_seconds(),
    )

    # Invalidate the one-time creds
    await redis.delete(creds_key)

    return {"ok": True}


@router.post("/refresh-token", response_description="Refresh token")
async def refresh_token(
    request: Request,
    response: Response,
    # This endpoint might become less necessary if get_current_principals handles silent refresh
    # well. However, frontend might still explicitly call it.
    # If kept, it should also refresh the app_token.
    # For now, let's assume get_current_principals is the primary way tokens are managed post-login.
    # We can revisit this endpoint's logic if it's still actively used by the frontend.
    kc_refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Explicitly refresh Keycloak access_token and app_token.
    """
    if not kc_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="No Keycloak refresh token provided"
        )

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager

    try:
        new_kc_creds = await kc_manager.refresh_access_token(kc_refresh_token)
        set_kc_auth_cookies(response, new_kc_creds)  # Set new Keycloak cookies

        # Validate new KC token to get principal for app token creation
        kc_principal = await kc_manager.validate_keycloak_token(new_kc_creds["access_token"])

        # Issue new app token
        new_app_token_str, new_app_claims = await app_token_manager.create_app_token(
            kc_principal["sub"], db_session
        )
        response.set_cookie(
            key=config.COOKIE_APP_NAME,
            value=new_app_token_str,
            httponly=True,
            secure=not config.IS_DEBUG,
            samesite="Lax",
            max_age=app_token_manager.token_expiry.total_seconds(),
        )

        return {**new_kc_creds, "app_token_claims": new_app_claims}  # Return all new token info

    except JWTError as e:  # Catch validation error for the new KC token
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Failed to validate new Keycloak token: {e}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Failed to refresh tokens: {str(e)}"
        )


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user(
    principals: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    extended: bool = False,  # under development
):
    """Returns current user data based on validated Keycloak and App tokens."""
    kc_principal, app_principal = principals

    # Use kc_principal for user identity (sub, email, etc.)
    # Use app_principal for application-specific roles/permissions
    sub: str = kc_principal.get("sub")

    # Example: You might want to ensure 'sub' exists in app_principal and matches kc_principal
    if not app_principal.get("sub") or app_principal.get("sub") != sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="App token subject mismatch."
        )
    qb = QueryBuilder(db_session, User)
    user: User = await qb.filter(User.sub == sub).first()
    tg_id: int = user.telegram_id

    # Construct user response. You might want to combine info from kc_principal and app_principal
    # For example, user profile from kc_principal, roles from app_principal
    user_data_for_response = {
        **kc_principal,  # Contains name, email, etc.
        "role": app_principal.get("role"),  # Example from your AppTokenManager
        "communities": app_principal.get("communities"),
    }

    # under development
    # if extended:
    #     events = qb.blank().filter(Event.user_id == user.id).all()
    #     user_data_for_response["events"] = events

    return CurrentUserResponse(user=user_data_for_response, tg_id=tg_id)


@router.get("/logout")
async def logout(
    request: Request,
    response: Response,
    refresh_token: Annotated[str | None, Cookie(alias=config.COOKIE_REFRESH_NAME)] = None,
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token found in cookies",
        )
    kc: KeyCloakManager = request.app.state.kc_manager

    try:
        await kc.revoke_offline_refresh_token(refresh_token)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Error revoking token: {e}"
        )

    unset_kc_auth_cookies(response)
    response.delete_cookie(key=config.COOKIE_APP_NAME)

    return status.HTTP_200_OK
