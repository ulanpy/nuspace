"""Telegram account linking flow (website deeplink + emoji confirmation)."""

from __future__ import annotations

from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession

from backend.modules.bot.repository import BotUserRepository


class DeeplinkStartResult(str, Enum):
    invalid_sub = "invalid_sub"
    needs_confirmation = "needs_confirmation"
    already_linked = "already_linked"


class TelegramLinkService:
    def __init__(
        self,
        db_session: AsyncSession,
        user_repository: BotUserRepository | None = None,
    ) -> None:
        self.user_repository = user_repository or BotUserRepository(db_session)

    async def handle_deeplink_start(self, sub: str, telegram_id: int) -> DeeplinkStartResult:
        if not await self.user_repository.exists_by_sub(sub):
            return DeeplinkStartResult.invalid_sub
        if await self.user_repository.is_linked_by_telegram_id(telegram_id):
            return DeeplinkStartResult.already_linked
        return DeeplinkStartResult.needs_confirmation

    async def confirm_link(
        self,
        sub: str,
        telegram_id: int,
        *,
        picked_number: int,
        expected_number: int,
    ) -> bool:
        if picked_number != expected_number:
            return False
        await self.user_repository.link_telegram_id(sub, telegram_id)
        return True
