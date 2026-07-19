from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.events import EventBotSubmission
from backend.core.database.models.user import User


class EventBotSubmissionRepository:
    def __init__(self, db_session: AsyncSession) -> None:
        self.db_session = db_session

    async def get_user_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.db_session.execute(select(User).where(User.telegram_id == telegram_id))
        return result.scalars().first()

    async def create(self, submission: EventBotSubmission) -> EventBotSubmission:
        self.db_session.add(submission)
        await self.db_session.flush()
        await self.db_session.refresh(submission)
        return submission

    async def save(self, submission: EventBotSubmission) -> EventBotSubmission:
        await self.db_session.flush()
        await self.db_session.refresh(submission)
        return submission
