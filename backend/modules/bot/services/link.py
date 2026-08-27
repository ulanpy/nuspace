"""Telegram account linking flow (website deeplink + emoji confirmation)."""

from __future__ import annotations

from enum import Enum

from backend.core.database.uow import UnitOfWork
from backend.modules.bot.repository import BotUserRepository
from backend.modules.bot.utils.telegram_link_tokens import (
    consume_telegram_link_token,
    get_telegram_link_confirmation_number,
)
from redis.asyncio import Redis


class DeeplinkStartResult(str, Enum):
    invalid_sub = "invalid_sub"
    needs_confirmation = "needs_confirmation"
    already_linked = "already_linked"


class TelegramLinkService:
    def __init__(
        self,
        uow: UnitOfWork,
        redis: Redis,
    ) -> None:
        self.uow = uow
        self.redis = redis

    async def handle_deeplink_start(
        self, token: str, telegram_id: int
    ) -> DeeplinkStartResult:
        confirmation_number = await get_telegram_link_confirmation_number(self.redis, token=token)
        if confirmation_number is None:
            return DeeplinkStartResult.invalid_sub
        async with self.uow:
            repo = self.uow.get_repo(BotUserRepository)
            if await repo.is_linked_by_telegram_id(telegram_id):
                return DeeplinkStartResult.already_linked
        return DeeplinkStartResult.needs_confirmation

    async def confirm_link(
        self,
        token: str,
        telegram_id: int,
        *,
        picked_number: int,
    ) -> bool:
        sub = await consume_telegram_link_token(
            self.redis,
            token=token,
            picked_number=picked_number,
        )
        if sub is None:
            return False
        async with self.uow:
            await self.uow.get_repo(BotUserRepository).link_telegram_id(sub, telegram_id)
        return True
