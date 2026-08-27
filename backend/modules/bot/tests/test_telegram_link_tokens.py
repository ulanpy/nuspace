from typing import Any

import pytest
from backend.modules.bot.utils.telegram_link_tokens import (
    consume_telegram_link_token,
    get_telegram_link_confirmation_number,
    issue_telegram_link_token,
)


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def setex(self, key: str, _ttl: int, value: str) -> None:
        self.values[key] = value

    async def get(self, key: str) -> str | None:
        return self.values.get(key)

    async def eval(self, _script: str, _keys: int, key: str, picked_number: str) -> list[Any]:
        value = self.values.get(key)
        if value is None or "\n" not in value:
            return [0]
        expected_number, sub = value.split("\n", maxsplit=1)
        if expected_number != picked_number:
            return [1]
        del self.values[key]
        return [2, sub]


@pytest.mark.asyncio
async def test_link_token_is_opaque_and_consumed_only_after_correct_confirmation() -> None:
    redis = FakeRedis()
    sub = "keycloak-user-sub"

    token, expected_number = await issue_telegram_link_token(redis, sub=sub)  # type: ignore[arg-type]

    assert sub not in token
    assert await get_telegram_link_confirmation_number(redis, token=token) == expected_number  # type: ignore[arg-type]
    assert await consume_telegram_link_token(  # type: ignore[arg-type]
        redis,
        token=token,
        picked_number=(expected_number % 10) + 1,
    ) is None
    assert await consume_telegram_link_token(  # type: ignore[arg-type]
        redis,
        token=token,
        picked_number=expected_number,
    ) == sub
    assert await consume_telegram_link_token(  # type: ignore[arg-type]
        redis,
        token=token,
        picked_number=expected_number,
    ) is None
