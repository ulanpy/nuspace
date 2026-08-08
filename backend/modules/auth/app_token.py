import logging
from datetime import UTC, datetime, timedelta
from typing import List

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.configs.config import config
from backend.core.database.uow import UnitOfWork
from backend.modules.campuscurrent.models import Community
from backend.modules.auth.models import User, UserRole

logger = logging.getLogger(__name__)


class AppTokenManager:
    def __init__(self):
        self.secret_key = config.APP_JWT_SECRET_256
        # Make app token expire slightly before access token
        self.token_expiry = timedelta(minutes=config.APP_TOKEN_EXPIRY_MINUTES)

    async def create_app_token(self, user_sub: str, uow: UnitOfWork) -> tuple[str, dict]:
        """
        Creates application-specific token with roles and permissions
        Returns (token, claims)
        """
        user_stmt = select(User).where(User.sub == user_sub)

        async with uow:
            db_session: AsyncSession = uow.session
            user_result = await db_session.execute(user_stmt)
            user: User | None = user_result.scalars().first()
            if not user:
                logger.error("App token creation failed: user %s not found", user_sub)
                raise RuntimeError(f"User {user_sub} not found while creating app token")

            user_role: UserRole = user.role
            communities_stmt = select(Community).where(Community.head == user_sub)
            communities_result = await db_session.execute(communities_stmt)
            headed_communities: List[Community] = list(communities_result.scalars().all())

        tg_id = user.telegram_id

        claims = {
            "sub": user_sub,
            "role": user_role.value,
            "communities": [community.id for community in headed_communities],
            "exp": datetime.now(UTC) + self.token_expiry,
            "tg_id": tg_id,
            "department_id": user.department_id,
        }

        token = jwt.encode(claims, self.secret_key, algorithm="HS256")

        return token, claims

    def validate_app_token(self, token: str) -> dict:
        """Validates app token and returns claims"""
        try:
            return jwt.decode(token, self.secret_key, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            # Let the caller handle expiration by creating new token
            raise
