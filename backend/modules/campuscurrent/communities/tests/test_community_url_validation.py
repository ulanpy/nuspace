from datetime import date
from typing import Callable

import pytest
from pydantic import BaseModel, ValidationError

from backend.modules.campuscurrent.communities.schemas import (
    CommunityCreateRequest,
    CommunityUpdateRequest,
)
from backend.modules.campuscurrent.models.community import (
    CommunityCategory,
    CommunityType,
)


def create_community(**overrides: object) -> CommunityCreateRequest:
    values = {
        "name": "Test Community",
        "type": CommunityType.club,
        "category": CommunityCategory.academic,
        "description": "Community used for validation tests",
        "established": date(2025, 1, 1),
        "head": "test-user",
    }
    values.update(overrides)
    return CommunityCreateRequest(**values)


ModelFactory = Callable[..., BaseModel]


@pytest.mark.parametrize("model_factory", [create_community, CommunityUpdateRequest])
def test_normalizes_valid_community_urls(model_factory: ModelFactory):
    community = model_factory(
        telegram_url=" www.t.me/community ",
        instagram_url="instagr.am/community",
    )

    assert community.telegram_url == "https://www.t.me/community"
    assert community.instagram_url == "https://instagr.am/community"


@pytest.mark.parametrize("model_factory", [create_community, CommunityUpdateRequest])
@pytest.mark.parametrize(
    ("field_name", "value", "error_message"),
    [
        ("telegram_url", "https://example.com/community", "Enter a Telegram URL"),
        ("instagram_url", "https://t.me/community", "Enter an Instagram URL"),
        ("instagram_url", "https://wtf://instagram.com/community", "Enter an Instagram URL"),
    ],
)
def test_rejects_invalid_community_urls(
    model_factory: ModelFactory,
    field_name: str,
    value: str,
    error_message: str,
):
    with pytest.raises(ValidationError) as exc_info:
        model_factory(**{field_name: value})

    assert error_message in str(exc_info.value)
