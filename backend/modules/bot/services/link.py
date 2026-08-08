"""Telegram account linking flow (website deeplink + emoji confirmation)."""

from __future__ import annotations

from enum import Enum

from backend.core.database.uow import UnitOfWork

from backend.modules.bot.repository import BotUserRepository


class DeeplinkStartResult(str, Enum):
    invalid_sub = "invalid_sub"
    needs_confirmation = "needs_confirmation"
    already_linked = "already_linked"


class TelegramLinkService:
    def __init__(
        self,
        uow: UnitOfWork,
    ) -> None:
        self.uow = uow

    async def handle_deeplink_start(self, sub: str, telegram_id: int) -> DeeplinkStartResult:
        async with self.uow:
            repo = self.uow.get_repo(BotUserRepository)
            if not await repo.exists_by_sub(sub):
                return DeeplinkStartResult.invalid_sub
            if await repo.is_linked_by_telegram_id(telegram_id):
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
        async with self.uow:
            await self.uow.get_repo(BotUserRepository).link_telegram_id(sub, telegram_id)
        return True
