"""One-time Redis-backed capabilities for Telegram account linking."""

from __future__ import annotations

import secrets
from random import randrange

from redis.asyncio import Redis

TELEGRAM_LINK_TOKEN_TTL_SECONDS = 600
_TOKEN_KEY_PREFIX = "telegram-link:"

# Atomically verifies the emoji choice and consumes a valid token.  The token
# itself is a bearer capability; neither a Nuspace ``sub`` nor the expected
# emoji is exposed in the Telegram deep-link/callback payload.
_CONSUME_TOKEN_SCRIPT = """
local value = redis.call('GET', KEYS[1])
if not value then
    return {0}
end

local separator = string.find(value, '\n', 1, true)
if not separator then
    return {0}
end

if string.sub(value, 1, separator - 1) ~= ARGV[1] then
    return {1}
end

redis.call('DEL', KEYS[1])
return {2, string.sub(value, separator + 1)}
"""


def _token_key(token: str) -> str:
    return f"{_TOKEN_KEY_PREFIX}{token}"


async def issue_telegram_link_token(redis: Redis, *, sub: str) -> tuple[str, int]:
    """Create a short-lived, opaque capability for linking ``sub`` to Telegram."""
    token = secrets.token_urlsafe(32)
    confirmation_number = randrange(1, 11)
    await redis.setex(
        _token_key(token),
        TELEGRAM_LINK_TOKEN_TTL_SECONDS,
        f"{confirmation_number}\n{sub}",
    )
    return token, confirmation_number


async def get_telegram_link_confirmation_number(redis: Redis, *, token: str) -> int | None:
    """Load the expected emoji for a valid, unconsumed linking token."""
    value = await redis.get(_token_key(token))
    if value is None:
        return None
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    number, separator, _sub = str(value).partition("\n")
    if not separator:
        return None
    try:
        return int(number)
    except ValueError:
        return None


async def consume_telegram_link_token(
    redis: Redis,
    *,
    token: str,
    picked_number: int,
) -> str | None:
    """Consume a valid token and return its target ``sub`` exactly once."""
    result = await redis.eval(
        _CONSUME_TOKEN_SCRIPT,
        1,
        _token_key(token),
        str(picked_number),
    )
    if not result or int(result[0]) != 2 or len(result) != 2:
        return None
    sub = result[1]
    return sub.decode("utf-8") if isinstance(sub, bytes) else str(sub)
