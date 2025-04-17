import random
from typing import Annotated

from aiogram import Bot
from aiogram.utils.deep_linking import create_start_link
from fastapi import APIRouter, Cookie, Depends, status
from fastapi.responses import RedirectResponse

from backend.common.dependencies import check_token, get_db_session
from backend.core.configs.config import config
from backend.routes.auth.keycloak_manager import KeyCloakManager
from backend.routes.auth.schemas import CurrentUserResponse, Sub

from .__init__ import *

router = APIRouter(tags=["Auth Routes"])


@router.get("/login")
async def login(request: Request):
    """
    Redirect user to Google login via Keycloak.
    """
    kc: KeyCloakManager = request.app.state.kc_manager
    return await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_redirect(
        request, kc.KEYCLOAK_REDIRECT_URI
    )


@router.get("/auth/callback", response_description="Redirect  user")
async def auth_callback(
    request: Request,
    response: Response,
    db_session: AsyncSession = Depends(get_db_session),
    creds: dict = Depends(exchange_code_for_credentials),
):
    """
    Handle the OAuth2 callback to exchange authorization code for tokens and issue JWT.
    """

    await validate_access_token(
        response,
        creds["access_token"],
        creds["refresh_token"],
        request.app.state.kc_manager,
    )
    user_schema: UserSchema = await create_user_schema(creds)
    await upsert_user(db_session, user_schema)
    # return creds

    frontend_url = f"{config.FRONTEND_HOST}"
    response = RedirectResponse(url=frontend_url, status_code=303)
    set_auth_cookies(response, creds)
    return response


@router.post("/bingtg")
async def bind_tg(request: Request, sub: Sub):
    bot: Bot = request.app.state.bot
    sub = sub.sub
    correct_number = random.randrange(1, 10)
    link = await create_start_link(bot, f"{sub}&{correct_number}", encode=True)
    return {"link": link, "correct_number": correct_number, "sub": sub}


@router.post("/refresh-token", response_description="Refresh token")
async def refresh_token(
    request: Request,
    response: Response,
    refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None,
):
    """
    Refresh access_token with refresh_token using HTTP-Only Cookie
    """
    kc: KeyCloakManager = request.app.state.kc_manager
    if not refresh_token:
        raise HTTPException(status_code=402, detail="No  refresh token provided")

    creds = await kc.refresh_access_token(refresh_token)
    await validate_access_token(
        response, creds.get("access_token"), creds.get("refresh_token"), kc
    )
    set_auth_cookies(response, creds)

    return creds


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user(
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """Returns current user data"""
    sub = user.get("sub")
    result = await db_session.execute(select(User.telegram_id).filter_by(sub=sub))
    tg_linked: bool = bool(result.scalars().first())

    return CurrentUserResponse(user=user, tg_linked=tg_linked)


@router.get("/logout")
async def logout(
    request: Request,
    response: Response,
    refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None,
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token found in cookies",
        )
    kc: KeyCloakManager = request.app.state.kc_manager

    try:
        await kc.refresh_access_token(refresh_token)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=f"Error revoking token: {e}"
        )

    unset_auth_cookies(response)

    return status.HTTP_200_OK
