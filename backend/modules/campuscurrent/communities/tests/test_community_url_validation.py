from typing import Callable

import pytest
from backend.modules.campuscurrent.communities.schemas import (
    CommunityCreateRequest,
    CommunityUpdateRequest,
)
from backend.modules.campuscurrent.models.community import (
    CommunityCategory,
    CommunityType,
)
from pydantic import BaseModel, ValidationError


def create_community(**overrides: object) -> CommunityCreateRequest:
    values = {
        "name": "Test Community",
        "type": CommunityType.club,
        "category": CommunityCategory.academic,
        "slug": "test-community",
        "page_content": {},
        "owner": "test-user",
    }
    values.update(overrides)
    return CommunityCreateRequest(**values)


def update_community(**overrides: object) -> CommunityUpdateRequest:
    return CommunityUpdateRequest(**overrides)


ModelFactory = Callable[..., BaseModel]


@pytest.mark.parametrize("model_factory", [create_community, update_community])
@pytest.mark.parametrize(
    "slug",
    [
        "nu-fencing-club",
        "abc",
        "a1b2-c3d4",
        "x" * 50,
    ],
)
def test_accepts_valid_slugs(model_factory: ModelFactory, slug: str):
    community = model_factory(slug=slug)
    assert community.slug == slug


@pytest.mark.parametrize("model_factory", [create_community, update_community])
@pytest.mark.parametrize(
    "slug",
    [
        "AB",
        "-leading",
        "trailing-",
        "double--hyphen",
        "has space",
        "under_score",
        "a",
        "ab",
        "x" * 51,
    ],
)
def test_rejects_invalid_slug_patterns(model_factory: ModelFactory, slug: str):
    with pytest.raises(ValidationError) as exc_info:
        model_factory(slug=slug)

    assert "Slug" in str(exc_info.value)


@pytest.mark.parametrize("model_factory", [create_community, update_community])
@pytest.mark.parametrize(
    "slug",
    [
        "edit",
        "admin",
        "new",
        "create",
        "api",
        "settings",
        "about",
        "terms-of-service",
        "privacy-policy",
        "communities",
        "users",
        "events",
        "courses",
        "announcements",
        "contacts",
        "opportunities",
        "profile",
        "sgotinish",
    ],
)
def test_rejects_reserved_words(model_factory: ModelFactory, slug: str):
    with pytest.raises(ValidationError) as exc_info:
        model_factory(slug=slug)

    assert "reserved" in str(exc_info.value)


@pytest.mark.parametrize(
    "slug",
    [
        "owner-edit",
        "nu-admin-club",
        "my-communities",
        "pages-create",
    ],
)
def test_reserved_words_only_apply_to_exact_match(slug: str):
    community = create_community(slug=slug)
    assert community.slug == slug
