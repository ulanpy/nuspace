import random
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


@router.get("/login")
async def login(request: Request):
    """
    Redirect user to Google login via Keycloak.
    """
    kc: KeyCloakManager = request.app.state.kc_manager
    print(kc.KEYCLOAK_REDIRECT_URI)
    return await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_redirect(
        request, kc.KEYCLOAK_REDIRECT_URI
    )


@router.get("/auth/callback", response_description="Redirect  user")
async def auth_callback(
    request: Request,
    db_session: AsyncSession = Depends(get_db_session),
    creds: dict = Depends(exchange_code_for_credentials),
):
    print(request.app.state.kc_manager.KEYCLOAK_REDIRECT_URI)
    """
    Handle the OAuth2 callback to exchange authorization code for tokens, issue JWT, and app token.
    """
    kc_manager: KeyCloakManager = request.app.state.kc_manager
    app_token_manager: AppTokenManager = request.app.state.app_token_manager

    try:
        # Validate the freshly obtained Keycloak access token
        # No refresh logic needed here as tokens are new
        await kc_manager.validate_keycloak_token(creds["access_token"])
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Keycloak token after code exchange: {str(e)}",
        )

    user_schema: UserSchema = await create_user_schema(creds)  # creds contain userinfo
    user: User = await upsert_user(db_session, user_schema)

    # Always create a new app token during initial login/callback
    app_token_str, app_claims = await app_token_manager.create_app_token(
        user.sub, db_session  # or kc_principal["sub"]
    )

    redirect_response = RedirectResponse(url=config.HOME_URL, status_code=303)
    set_kc_auth_cookies(redirect_response, creds)  # Set Keycloak cookies
    redirect_response.set_cookie(  # Set App token cookie
        key=config.COOKIE_APP_NAME,
        value=app_token_str,
        httponly=True,
        secure=not config.IS_DEBUG,
        samesite="Lax",
        max_age=app_token_manager.token_expiry.total_seconds(),  # Optional: align with token expiry
    )
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
