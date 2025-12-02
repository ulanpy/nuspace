import json
import random
import secrets
from typing import Annotated
from urllib.parse import urljoin, urlparse

from aiogram import Bot
from aiogram.utils.deep_linking import create_start_link
from authlib.integrations.base_client.errors import MismatchingStateError, OAuthError
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import (
    get_creds_or_401,
    get_db_session,
    get_infra, #TODO use this dependecy instead raw request.app.state
)
from backend.core.configs.config import config
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.schemas import CurrentUserResponse, Sub

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
async def login(
    request: Request,
    state: str | None = None,
    return_to: str | None = None,
    mock_user: str | None = "2",  # shorthand alias
):
    kc: KeyCloakManager = request.app.state.kc_manager
    redis: Redis = request.app.state.redis

    # If no state provided (normal web), create CSRF state
    if not state:
        state = secrets.token_urlsafe(32)
        csrf_key = f"csrf:{state}"
        # Optionally: await redis.set(csrf_key, return_to or "/", ex=600, nx=True)
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
    state: str | None = None,
):
    if not state:
        raise HTTPException(status_code=400, detail="Missing state")

    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager
    redis: Redis = request.app.state.redis
    code = request.query_params.get("code") or ""

    csrf_key = f"csrf:{state}"
    csrf_return_to = await redis.get(csrf_key)
    if csrf_return_to is None:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    redirect_url = config.HOME_URL
    if csrf_return_to:
        try:
            csrf_return_to_str = (
                csrf_return_to.decode("utf-8")
                if isinstance(csrf_return_to, (bytes, bytearray))
                else str(csrf_return_to)
            ).strip()
        except UnicodeDecodeError:
            csrf_return_to_str = ""

        parsed_return_to = urlparse(csrf_return_to_str)
        if (
            csrf_return_to_str
            and not parsed_return_to.scheme
            and not parsed_return_to.netloc
            and parsed_return_to.path.startswith("/")
            and not parsed_return_to.path.startswith("//")
        ):
            # Only allow relative paths so attackers can't craft open redirects
            redirect_url = urljoin(config.HOME_URL, csrf_return_to_str)

    code_key: str | None = None
    if code:
        code_key = f"kc_code:{code}"
        if await redis.exists(code_key):
            await redis.delete(csrf_key)
            return RedirectResponse(url=config.HOME_URL, status_code=303)

    try:
        creds = await exchange_code_for_credentials(request)
    except MismatchingStateError as exc:
        await redis.delete(csrf_key)
        raise HTTPException(
            status_code=400, detail="Login session expired. Please try again."
        ) from exc
    except OAuthError as exc:
        await redis.delete(csrf_key)
        raise HTTPException(
            status_code=400, detail=f"Authorization failed: {exc.error}"
        ) from exc
    except Exception as exc:
        await redis.delete(csrf_key)
        raise HTTPException(
            status_code=502, detail="Unexpected error while contacting identity provider."
        ) from exc

    # Validate Keycloak token from the fresh exchange (skip in mock mode)
    if not config.MOCK_KEYCLOAK:
        try:
            await kc_manager.validate_keycloak_token(creds["access_token"])
        except JWTError as e:
            raise HTTPException(
                status_code=401, detail=f"Invalid Keycloak token after code exchange: {str(e)}"
            )

    # Upsert user and mint app token
    try:
        user_schema: UserSchema = await create_user_schema(creds)
    except Exception:
        raise

    try:
        user: User = await upsert_user(db_session, user_schema)
    except Exception:
        raise

    try:
        app_token_str, _claims = await app_token_manager.create_app_token(user.sub, db_session)
    except Exception:
        raise

    # Prepare base redirect and cookies
    redirect_response = RedirectResponse(url=redirect_url, status_code=303)
    set_kc_auth_cookies(redirect_response, creds)
    redirect_response.set_cookie(
        key=config.COOKIE_APP_NAME,
        value=app_token_str,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=app_token_manager.token_expiry.total_seconds(),
    )

    if code_key:
        await redis.setex(code_key, 300, "used")

    await redis.delete(csrf_key)
    # Optional: validate return_to against a whitelist to prevent open redirects
    return redirect_response


@router.post("/connect-tg")
async def bind_tg(request: Request, sub_param: Sub):
    bot: Bot = request.app.state.bot
    sub_value = sub_param.sub
    correct_number = random.randrange(1, 10)
    link = await create_start_link(bot, f"{sub_value}&{correct_number}", encode=True)
    return {"link": link, "correct_number": correct_number, "sub": sub_value}


@router.post("/refresh-token", response_description="Refresh token")
async def refresh_token(
    request: Request,
    response: Response,
    # This endpoint might become less necessary if get_creds_or_401 handles silent refresh
    # well. However, frontend might still explicitly call it.
    # If kept, it should also refresh the app_token.
    # For now, let's assume get_creds_or_401 is the primary way tokens are managed post-login.
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
    principals: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
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
    department_id: int = user.department_id
    # Construct user response. You might want to combine info from kc_principal and app_principal
    # For example, user profile from kc_principal, roles from app_principal
    user_data_for_response = {
        **kc_principal,  # Contains name, email, etc.
        "role": app_principal.get("role"),  # Example from your AppTokenManager
        "communities": app_principal.get("communities"),
        "department_id": department_id,
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
