import json
import logging
import random
import secrets
from typing import Annotated
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

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
    _select_mock_user,
    build_mock_creds,
    create_user_schema,
    exchange_code_for_credentials,
    set_kc_auth_cookies,
    unset_kc_auth_cookies,
)

router = APIRouter(tags=["Auth Routes"])
logger = logging.getLogger(__name__)


# /login: always pass a state
@router.get("/login")
async def login(
    request: Request,
    state: str | None = None,
    return_to: str | None = None,
    mock_user: str | None = "1",  # shorthand alias
):
    kc: KeyCloakManager = request.app.state.kc_manager
    redis = request.app.state.redis

    # If no state provided (normal web), create CSRF state
    if not state:
        state = secrets.token_urlsafe(32)
        csrf_key = f"csrf:{state}"
        # Optionally: await redis.set(csrf_key, return_to or "/", ex=600, nx=True)
        await redis.setex(csrf_key, 600, return_to or "/")
    else:
        # If state is provided (e.g., MiniApp or custom client), still remember desired return_to
        if return_to is not None:
            csrf_key = f"csrf:{state}"
            await redis.setex(csrf_key, 600, return_to or "/")

    # Dev mock: bypass external IdP entirely
    if config.MOCK_KEYCLOAK:
        cb = kc.KEYCLOAK_REDIRECT_URI
        sep = "&" if "?" in cb else "?"
        callback_url = f"{cb}{sep}state={state}"
        if mock_user:
            callback_url += f"&mock_user={mock_user}"
        return RedirectResponse(url=callback_url, status_code=303)

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

    # Validate Keycloak token from the fresh exchange (skip in mock mode)
    if not config.MOCK_KEYCLOAK:
        try:
            await kc_manager.validate_keycloak_token(creds["access_token"])
        except JWTError as e:
            raise HTTPException(
                status_code=401, detail=f"Invalid Keycloak token after code exchange: {str(e)}"
            )

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
    print(f"miniapp_exists: {miniapp_exists}")
    if miniapp_exists:
        print(f"miniapp flow detected with state: {state}", flush=True)
        # Preserve the MiniApp-specific return_to value if present
        miniapp_return_to = (
            miniapp_exists.decode()
            if isinstance(miniapp_exists, (bytes, bytearray))
            else miniapp_exists
        )
        print(f"miniapp_return_to: {miniapp_return_to}", flush=True)
        try:
            # Store minimal creds needed; TTL prevents long exposure
            await redis.setex(
                creds_key,
                300,
                json.dumps(
                    {
                        "access_token": creds.get("access_token"),
                        "refresh_token": creds.get("refresh_token"),
                        "id_token": creds.get("id_token"),
                        # Include userinfo so /miniapp/login/exchange can upsert the user
                        "userinfo": creds.get("userinfo"),
                    }
                ),
            )
            print(f"stored creds in redis with key: {creds_key}", flush=True)
        finally:
            await redis.delete(miniapp_state_key)
            # Also clear any CSRF mapping tied to this state, if one was set
            try:
                await redis.delete(f"csrf:{state}")
            except Exception:
                pass

        # If a return_to was supplied for MiniApp, honor it ONLY if it is a Telegram deep link.
        # Ensure the deep link includes the startapp=<state> parameter so the Mini App reopens with the code.
        # Otherwise, fall back to the canonical t.me deep link so the user is returned to Telegram.
        if miniapp_return_to:
            print(f"processing miniapp_return_to: {miniapp_return_to}", flush=True)
            try:
                # Accept only Telegram deep links here; anything else would strand the user in the external browser.
                if miniapp_return_to:
                    try:
                        parsed = urlparse(miniapp_return_to)
                        qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
                        print(f"parsed query params: {qs}", flush=True)
                        if "startapp" not in qs and state:
                            qs["startapp"] = state
                            new_query = urlencode(qs, doseq=True)
                            miniapp_return_to = urlunparse(parsed._replace(query=new_query))
                            print(f"modified return_to with startapp: {miniapp_return_to}", flush=True)
                    except Exception as e:
                        print(f"error parsing return_to URL: {str(e)}", flush=True)
                        # If parsing fails, proceed with the original URL
                        pass
                    redirect_response.headers["Location"] = miniapp_return_to
                    print(f"redirecting to: {miniapp_return_to}", flush=True)
                    return redirect_response
            except Exception as e:
                print(f"error setting redirect header: {str(e)}", flush=True)
                # If setting the header fails but the URL is a valid Telegram link, fall back to a direct redirect
                if isinstance(miniapp_return_to, str) and (
                    miniapp_return_to.startswith("https://t.me/")
                    or miniapp_return_to.startswith("tg://")
                ):
                    # Try to ensure startapp=<state> as above
                    try:
                        parsed = urlparse(miniapp_return_to)
                        qs = dict(parse_qsl(parsed.query, keep_blank_values=True))
                        if "startapp" not in qs and state:
                            qs["startapp"] = state
                            new_query = urlencode(qs, doseq=True)
                            miniapp_return_to = urlunparse(parsed._replace(query=new_query))
                            print(f"fallback: modified return_to with startapp: {miniapp_return_to}", flush=True)
                    except Exception as e:
                        print(f"error in fallback URL parsing: {str(e)}", flush=True)
                        pass
                    return RedirectResponse(url=miniapp_return_to, status_code=303)
            # Non-Telegram return_to provided: ignore and proceed to the standard t.me fallback below

        # Fallback: send user back to Telegram mini app
        bot_username = request.app.state.bot_username
        tme_url = f"https://t.me/{bot_username}?startapp={state}"
        print(f"using fallback t.me URL: {tme_url}", flush=True)
        return RedirectResponse(url=tme_url, status_code=303)

    # 2) Web flow: validate CSRF state and consume it
    csrf_key = f"csrf:{state}"
    csrf_return_to = await redis.get(csrf_key)
    if csrf_return_to is not None:
        await redis.delete(csrf_key)
        # Honor the stored return_to for standard web flow (skip whitelist validation as requested)
        try:
            csrf_return_to_str = (
                csrf_return_to.decode()
                if isinstance(csrf_return_to, (bytes, bytearray))
                else csrf_return_to
            )
            redirect_response.headers["Location"] = csrf_return_to_str
        except Exception:
            # As a fallback, create a fresh RedirectResponse with the desired URL
            return RedirectResponse(url=csrf_return_to, status_code=303)
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
    request: Request,
    return_to: str | None = None,
    mock_user: str | None = "1",
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

    # Dev-only: pre-mint mock credentials so exchange can succeed without Keycloak
    if config.MOCK_KEYCLOAK:
        try:
            userinfo = _select_mock_user(mock_user)
            creds = build_mock_creds(userinfo)
            creds_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}creds:{code}"
            await redis.setex(
                creds_key,
                300,
                json.dumps(
                    {
                        "access_token": creds.get("access_token"),
                        "refresh_token": creds.get("refresh_token"),
                        "id_token": creds.get("id_token"),
                        # Include userinfo for the exchange step
                        "userinfo": creds.get("userinfo"),
                    }
                ),
            )
        except Exception:
            # Non-fatal in dev; exchange can still proceed if real login happens
            pass

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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON body",
            headers={"X-MiniApp-Exchange": "invalid-json"},
        )

    code = (payload or {}).get("code")
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing code",
            headers={"X-MiniApp-Exchange": "missing-code"},
        )

    creds_key = f"{config.TG_APP_LOGIN_STATE_REDIS_PREFIX}creds:{code}"
    raw_creds = await redis.get(creds_key)
    if not raw_creds:
        # Not ready yet — add explicit trace and header so 404s can be attributed
        try:
            client_ip = request.client.host if getattr(request, "client", None) else "unknown"
            ua = request.headers.get("user-agent", "")
            logger.info(
                "miniapp_login_exchange: not ready yet (code=%s, ip=%s, ua=%s)",
                code,
                client_ip,
                ua,
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not ready",
            headers={"X-MiniApp-Exchange": "not-ready"},
        )

    try:
        creds = json.loads(raw_creds)
    except Exception:
        await redis.delete(creds_key)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Corrupted credentials",
            headers={"X-MiniApp-Exchange": "corrupted-creds"},
        )

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager

    # Validate KC token (skip in mock mode)
    if not config.MOCK_KEYCLOAK:
        try:
            await kc_manager.validate_keycloak_token(creds["access_token"])
        except JWTError as e:
            await redis.delete(creds_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Keycloak token: {str(e)}",
                headers={"X-MiniApp-Exchange": "invalid-kc-token"},
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

    try:
        response.headers["X-MiniApp-Exchange"] = "ok"
    except Exception:
        pass
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
        if config.MOCK_KEYCLOAK:
            # Parse mock refresh token: mock_refresh_<sub>
            if not kc_refresh_token.startswith("mock_refresh_"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid mock refresh token"
                )
            sub = kc_refresh_token.removeprefix("mock_refresh_")
            # Build new mock creds
            from .utils import (  # local import to avoid cycles
                build_mock_creds,
                get_mock_user_by_sub,
            )

            userinfo = get_mock_user_by_sub(sub)
            new_kc_creds = build_mock_creds(userinfo)
        else:
            new_kc_creds = await kc_manager.refresh_access_token(kc_refresh_token)

        set_kc_auth_cookies(response, new_kc_creds)

        # Determine principal subject
        if config.MOCK_KEYCLOAK:
            kc_principal_sub = new_kc_creds["userinfo"]["sub"]
        else:
            kc_principal = await kc_manager.validate_keycloak_token(new_kc_creds["access_token"])
            kc_principal_sub = kc_principal["sub"]

        # Issue new app token
        new_app_token_str, new_app_claims = await app_token_manager.create_app_token(
            kc_principal_sub, db_session
        )
        response.set_cookie(
            key=config.COOKIE_APP_NAME,
            value=new_app_token_str,
            httponly=True,
            secure=not config.IS_DEBUG,
            samesite="Lax",
            max_age=app_token_manager.token_expiry.total_seconds(),
        )

        return {**new_kc_creds, "app_token_claims": new_app_claims}

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
        if not config.MOCK_KEYCLOAK:
            await kc.revoke_offline_refresh_token(refresh_token)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Error revoking token: {e}"
        )

    unset_kc_auth_cookies(response)
    response.delete_cookie(key=config.COOKIE_APP_NAME)

    return status.HTTP_200_OK
