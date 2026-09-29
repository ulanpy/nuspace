from typing import List, Tuple

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import User, UserCategory, UserScope
from backend.modules.auth.schemas import UserSchema
from backend.modules.media.models import EntityType, Media, MediaFormat
from backend.modules.pages.models.page import Community, CommunityAdmin
from backend.modules.shared.slug import generate_unique_slug

# Owned by the user, not by Keycloak. UserSchema defaults page_content={} and
# is_page_public=False, and both are non-None, so copying them onto an existing
# row would wipe a designed profile page on every login. `slug` is claimed from
# the user's own name, not from a token claim, and is generated below.
LOCAL_FIELDS = {"page_content", "is_page_public", "slug", "category"}


class UserRepository:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def upsert(self, user_schema: UserSchema) -> User:
        result = await self.db_session.execute(
            select(User).filter(or_(User.sub == user_schema.sub, User.email == user_schema.email))
        )
        user_db = result.scalars().first()

        if user_db:
            for key, value in user_schema.model_dump().items():
                if key not in ("role", "scope") and key not in LOCAL_FIELDS and value is not None:
                    setattr(user_db, key, value)
        else:
            data = user_schema.model_dump()
            if not data.get("slug"):
                full_name = f"{data.get('name', '')} {data.get('surname', '')}".strip()
                data["slug"] = await generate_unique_slug(
                    full_name or "user", User, session=self.db_session
                )
            user_db = User(**data)
            self.db_session.add(user_db)

        if not user_db.slug:
            full_name = f"{user_db.name} {user_db.surname}".strip()
            user_db.slug = await generate_unique_slug(
                full_name or "user", User, session=self.db_session
            )

        await self.db_session.flush()
        await self.db_session.refresh(user_db)
        return user_db

    async def get_by_sub(self, sub: str) -> User | None:
        result = await self.db_session.execute(select(User).where(User.sub == sub))
        return result.scalars().first()

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.db_session.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> User | None:
        result = await self.db_session.execute(select(User).where(User.slug == slug))
        return result.scalars().first()

    async def list_public(
        self,
        *,
        page: int,
        size: int,
        keyword: str | None = None,
        category: UserCategory | None = None,
    ) -> Tuple[List[User], int]:
        """Users whose profile page is published, for the public directory.

        The visibility filter is a hard WHERE, never a caller-supplied
        parameter: making it one would let anyone enumerate private pages.
        """
        conditions = [User.is_page_public.is_(True), User.scope == UserScope.allowed]
        if keyword:
            pattern = f"%{keyword}%"
            conditions.append(or_(User.name.ilike(pattern), User.surname.ilike(pattern)))
        if category:
            conditions.append(User.category == category)

        # name alone is not a stable sort — siblings share a first name, and
        # OFFSET over a non-deterministic order drops and repeats rows across
        # page boundaries. surname and sub break the ties all the way down.
        stmt = (
            select(User)
            .where(*conditions)
            .order_by(User.name.asc(), User.surname.asc(), User.sub.asc())
            .offset((page - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        users = list(result.scalars().all())
        count_stmt = select(func.count()).select_from(User).where(*conditions)
        count_result = await self.db_session.execute(count_stmt)
        return users, count_result.scalar() or 0

    async def list_headed_communities(self, user_sub: str) -> List[Tuple[Community, str]]:
        """Communities this person owns or admins, each with the position.

        One query, because the profile page needs both halves and the union of
        them is the interesting part. Owned communities are not rows in
        `community_admins`, so the owner case is a LEFT JOIN and the position
        comes from which side of it matched.
        """
        stmt = (
            select(Community, CommunityAdmin)
            .outerjoin(CommunityAdmin, CommunityAdmin.community_id == Community.id)
            .where(
                or_(
                    Community.owner == user_sub,
                    CommunityAdmin.user_sub == user_sub,
                )
            )
            .order_by(Community.name.asc())
        )
        result = await self.db_session.execute(stmt)
        return [
            (community, "owner" if community.owner == user_sub else "admin")
            for community, admin in result.all()
        ]

    async def list_media(
        self, user_ids: List[int], media_formats: List[MediaFormat] | None = None
    ) -> List[Media]:
        filters = [Media.entity_id.in_(user_ids), Media.entity_type == EntityType.users]
        if media_formats:
            filters.append(Media.media_format.in_(media_formats))
        stmt = select(Media).where(*filters)
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())

    async def update_scope(self, sub: str, scope: UserScope) -> User | None:
        user = await self.get_by_sub(sub)
        if user is None:
            return None
        user.scope = scope
        if scope == UserScope.banned:
            user.is_page_public = False
        await self.db_session.flush()
        await self.db_session.refresh(user)
        return user
