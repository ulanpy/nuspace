import time

import pytest
from aiogram.exceptions import TelegramForbiddenError, TelegramRetryAfter
from aiogram.methods import SendMessage
from backend.modules.bot.services.direct_message import DirectMessenger, SendRateLimiter


class _Bot:
    def __init__(self, *errors: Exception) -> None:
        self.errors = list(errors)
        self.calls = 0

    async def send_message(self, chat_id, text, **kwargs):
        self.calls += 1
        if self.errors:
            raise self.errors.pop(0)


def _messenger(bot: _Bot) -> DirectMessenger:
    return DirectMessenger(bot, SendRateLimiter(rate_per_second=1000))


def _send(messenger: DirectMessenger):
    return messenger.send(1, "hi", button_label="Open", button_url="https://events.nuspace.kz/1")


@pytest.mark.asyncio
async def test_limiter_spaces_sends_apart() -> None:
    limiter = SendRateLimiter(rate_per_second=20)
    started = time.monotonic()
    for _ in range(5):
        await limiter.acquire()
    assert time.monotonic() - started >= 4 * 0.05 - 0.01


@pytest.mark.asyncio
async def test_a_blocked_bot_is_reported_not_raised_and_not_retried() -> None:
    method = SendMessage(chat_id=1, text="hi")
    bot = _Bot(TelegramForbiddenError(method=method, message="blocked"))

    assert await _send(_messenger(bot)) is False
    assert bot.calls == 1


@pytest.mark.asyncio
async def test_a_flood_wait_is_retried_once() -> None:
    method = SendMessage(chat_id=1, text="hi")
    bot = _Bot(TelegramRetryAfter(method=method, message="slow", retry_after=0))

    assert await _send(_messenger(bot)) is True
    assert bot.calls == 2


@pytest.mark.asyncio
async def test_a_second_flood_wait_gives_up() -> None:
    method = SendMessage(chat_id=1, text="hi")
    flood = TelegramRetryAfter(method=method, message="slow", retry_after=0)
    bot = _Bot(flood, flood)

    assert await _send(_messenger(bot)) is False
    assert bot.calls == 2
