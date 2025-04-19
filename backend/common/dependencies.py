from typing import Annotated, AsyncGenerator

from fastapi import Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.manager import AsyncDatabaseManager
from backend.core.database.models import User


async def get_db_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Retrieve the database session from the shared db_manager"""
    db_manager: AsyncDatabaseManager = request.app.state.db_manager
    async for session in db_manager.get_async_session():
        yield session


async def check_token(
    request: Request,
    response: Response,
    access_token: Annotated[str | None, Cookie(alias="access_token")] = None,
    refresh_token: Annotated[str | None, Cookie(alias="refresh_token")] = None,
) -> dict:
    """Dependency to validate Keycloak token from HTTP-only Secure cookie."""
    if not access_token or not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing access and/or refresh token cookie",
        )
    from backend.routes.auth.keycloak_manager import KeyCloakManager
    from backend.routes.auth.utils import validate_access_token

    kc: KeyCloakManager = request.app.state.kc_manager
    return await validate_access_token(response, access_token, refresh_token, kc)


async def check_tg(
    user: Annotated[dict, Depends(check_token)],
    db_session: AsyncSession = Depends(get_db_session),
) -> bool:
    sub = user.get("sub")
    result = await db_session.execute(select(User.telegram_id).filter_by(sub=sub))
    tg_id = result.scalars().first()

    if not tg_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Telegram not linked"
        )
    return True
