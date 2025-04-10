from fastapi import APIRouter, Depends, status, Cookie
from fastapi.responses import RedirectResponse
from typing import Annotated
from aiogram import Bot
from aiogram.utils.deep_linking import create_start_link
import random

from .__init__ import *
from backend.routes.auth.schemas import Sub, CurrentUserResponse
from backend.core.configs.config import config
from backend.common.dependencies import get_db_session, check_token
from backend.routes.auth.keycloak_manager import KeyCloakManager

router = APIRouter(tags=['Auth Routes'])


@router.get("/login")
async def login(request: Request):
    """
    Redirect user to Google login via Keycloak.
    """
    kc: KeyCloakManager = request.app.state.kc_manager
    return await getattr(kc.oauth, kc.__class__.__name__.lower()).authorize_redirect(request, kc.KEYCLOAK_REDIRECT_URI)



@router.post("/bingtg")
async def bind_tg(request: Request, sub: Sub):
    bot: Bot = request.app.state.bot
    sub = sub.sub
    correct_number = random.randrange(1,10)
    link = await create_start_link(bot, f"{sub}&{correct_number}", encode=True)
    return {
                "link": link,
                "correct_number": correct_number,
                "sub": sub
            }


@router.get("/auth/callback", response_description="Redirect  user")
async def auth_callback(request: Request, response: Response, db_session: AsyncSession = Depends(get_db_session),
                        creds: dict = Depends(exchange_code_for_credentials)):
    """
    Handle the OAuth2 callback to exchange authorization code for tokens and issue JWT.
    """

    await validate_access_token(creds["access_token"], request.app.state.kc_manager)
    user_schema: UserSchema = await create_user_schema(creds)
    await upsert_user(db_session, user_schema)
    frontend_url = f"{config.FRONTEND_HOST}:{config.nginx_port}/"
    response = RedirectResponse(url=frontend_url, status_code=303)
    set_auth_cookies(response, creds)
    return response


@router.post("/refresh-token/", response_description="Refresh token")
async def refresh_token(request: Request, response: Response,
                        refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None):
    """
    Refresh access_token with refresh_token using HTTP-Only Cookie
    """
    kc: KeyCloakManager = request.app.state.kc_manager
    if not refresh_token:
        raise HTTPException(status_code=402, detail="No  refresh token provided")

    creds = await refresh_access_token(refresh_token, kc)

    await validate_access_token(creds.get("access_token"), kc)
    set_auth_cookies(response, creds)

    return creds


@router.get("/me", response_model=CurrentUserResponse)
async def get_current_user(
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session)
):
    """Returns current user data"""
    sub = user.get("sub")
    result = await db_session.execute(select(User.telegram_id).filter_by(sub=sub))
    tg_linked: bool = bool(result.scalars().first())

    return CurrentUserResponse(user=user, tg_linked=tg_linked)



