from datetime import UTC, datetime, timedelta
from typing import List

import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.core.configs.config import config
from backend.core.database.models import Community, User, UserRole


class AppTokenManager:
    def __init__(self):
        self.secret_key = config.APP_JWT_SECRET_256
        # Make app token expire slightly before access token
        self.token_expiry = timedelta(minutes=config.APP_TOKEN_EXPIRY_MINUTES)

    async def create_app_token(self, user_sub: str, db_session: AsyncSession) -> tuple[str, dict]:
        """
        Creates application-specific token with roles and permissions
        Returns (token, claims)
        """
        # Get application-specific info
        qb = QueryBuilder(db_session, User)
        user: User = await qb.filter(User.sub == user_sub).first()
        user_role: UserRole = user.role
        headed_communities: List[Community] = (
            await qb.blank(Community).filter(Community.head == user_sub).all()
        )

        tg_id = (await qb.blank().filter(User.sub == user_sub).first()).telegram_id

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
