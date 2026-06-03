from fastapi import Depends, Request
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.modules.auth.app_token import AppTokenManager
from backend.modules.auth.keycloak_manager import KeyCloakManager
from backend.modules.auth.service import AuthService


def get_keycloak_manager(request: Request) -> KeyCloakManager:
    return request.app.state.kc_manager


def get_app_token_manager(request: Request) -> AppTokenManager:
    return request.app.state.app_token_manager


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_auth_service(
    db_session: AsyncSession = Depends(get_db_session),
    kc_manager: KeyCloakManager = Depends(get_keycloak_manager),
    app_token_manager: AppTokenManager = Depends(get_app_token_manager),
) -> AuthService:
    return AuthService(
        db_session=db_session,
        kc_manager=kc_manager,
        app_token_manager=app_token_manager,
    )
