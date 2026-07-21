"""Bot data access: Telegram account linking and event submission log."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.auth.models import User
from backend.modules.campuscurrent.models.events import EventBotSubmission


class BotUserRepository:
    """Reads and updates ``users`` for Telegram ↔ nuspace linking."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def exists_by_sub(self, sub: str) -> bool:
        result = await self.db_session.execute(select(User.sub).where(User.sub == sub))
        return result.scalars().first() is not None

    async def is_linked_by_telegram_id(self, telegram_id: int) -> bool:
        result = await self.db_session.execute(
            select(User.email).where(User.telegram_id == telegram_id)
        )
        return result.scalars().first() is not None

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.db_session.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        return result.scalars().first()

    async def link_telegram_id(self, sub: str, telegram_id: int) -> None:
        result = await self.db_session.execute(select(User).where(User.sub == sub))
        user = result.scalars().one()
        user.telegram_id = telegram_id
        await self.db_session.flush()


class EventBotSubmissionRepository:
    """Persists Telegram → event ingestion attempts."""

    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def create(self, submission: EventBotSubmission) -> EventBotSubmission:
        self.db_session.add(submission)
        await self.db_session.flush()
        await self.db_session.refresh(submission)
        return submission

    async def save(self, submission: EventBotSubmission) -> EventBotSubmission:
        await self.db_session.flush()
        await self.db_session.refresh(submission)
        return submission
