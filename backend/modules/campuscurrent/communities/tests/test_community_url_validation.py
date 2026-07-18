from datetime import date
from typing import Callable

import pytest
from pydantic import BaseModel, ValidationError

from backend.core.database.models.community import (
    CommunityCategory,
    CommunityRecruitmentStatus,
    CommunityType,
)
from backend.modules.campuscurrent.communities.schemas import (
    CommunityCreateRequest,
    CommunityUpdateRequest,
)


def create_community(**overrides: object) -> CommunityCreateRequest:
    values = {
        "name": "Test Community",
        "type": CommunityType.club,
        "category": CommunityCategory.academic,
        "recruitment_status": CommunityRecruitmentStatus.closed,
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
        recruitment_link="example.com/apply",
    )

    assert community.telegram_url == "https://www.t.me/community"
    assert community.instagram_url == "https://instagr.am/community"
    assert str(community.recruitment_link) == "https://example.com/apply"


@pytest.mark.parametrize("model_factory", [create_community, CommunityUpdateRequest])
@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("telegram_url", "https://telegram.org/community", "Enter a Telegram URL"),
        ("telegram_url", "https://t.me:invalid/community", "Enter a Telegram URL"),
        ("telegram_url", "https://wtf://t.me/community", "Enter a Telegram URL"),
        ("instagram_url", "https://help.instagram.com/community", "Enter an Instagram URL"),
        ("instagram_url", "wtf://instagram.com/community", "Enter an Instagram URL"),
        ("recruitment_link", "http://example.com/apply", "Enter an HTTPS URL"),
        ("recruitment_link", "https://wtf://example.com", "Enter an HTTPS URL"),
    ],
)
def test_rejects_invalid_community_urls(
    model_factory: ModelFactory,
    field: str,
    value: str,
    message: str,
):
    with pytest.raises(ValidationError, match=message):
        model_factory(**{field: value})
