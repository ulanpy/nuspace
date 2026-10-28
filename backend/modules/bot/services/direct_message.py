"""Direct messages to a person from the bot, within Telegram's send rate.

The one live path for "tell this person something, with a button": notices of
cancelled or moved events today, the 24h reminder (#447) next. Callers hand over
a chat id, an HTML body and one URL button; failures (bot blocked, chat gone)
are logged and reported as `False`, never raised and never retried forever.
"""

import asyncio
import logging
import time

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramRetryAfter
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

logger = logging.getLogger(__name__)

# Telegram allows about 30 messages per second across all chats; stay under it.
SEND_RATE_PER_SECOND = 25
# A flood-wait longer than this is not worth holding a send open for.
MAX_RETRY_AFTER_SECONDS = 30


class SendRateLimiter:
    """Spaces sends `1 / rate` seconds apart, shared by every caller in the process."""

    def __init__(self, rate_per_second: float = SEND_RATE_PER_SECOND) -> None:
        self._interval = 1.0 / rate_per_second
        self._next_slot = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            slot = max(now, self._next_slot)
            self._next_slot = slot + self._interval
        if slot > now:
            await asyncio.sleep(slot - now)


shared_limiter = SendRateLimiter()


class DirectMessenger:
    """Sends one DM with one URL button. Implements events' `AttendeeMessenger` port."""

    def __init__(self, bot: Bot, limiter: SendRateLimiter | None = None) -> None:
        self.bot = bot
        self.limiter = limiter or shared_limiter

    async def send(
        self, telegram_id: int, text: str, *, button_label: str, button_url: str
    ) -> bool:
        markup = InlineKeyboardMarkup(
            inline_keyboard=[[InlineKeyboardButton(text=button_label, url=button_url)]]
        )
        try:
            await self._send_once(telegram_id, text, markup)
        except TelegramRetryAfter as exc:
            if exc.retry_after > MAX_RETRY_AFTER_SECONDS:
                logger.warning("Telegram flood wait of %ss; dropping DM", exc.retry_after)
                return False
            await asyncio.sleep(exc.retry_after)
            try:
                await self._send_once(telegram_id, text, markup)
            except Exception:
                logger.warning(
                    "DM to Telegram chat %s failed after retry", telegram_id, exc_info=True
                )
                return False
        except Exception:
            # Most often the person blocked the bot; nothing a retry would fix.
            logger.warning("DM to Telegram chat %s failed", telegram_id, exc_info=True)
            return False
        return True

    async def _send_once(self, telegram_id: int, text: str, markup: InlineKeyboardMarkup) -> None:
        await self.limiter.acquire()
        await self.bot.send_message(
            telegram_id,
            text,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
            disable_web_page_preview=True,
        )
