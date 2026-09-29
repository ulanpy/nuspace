from typing import Callable

import pytest
from backend.modules.pages.models.page import PageVisibility
from backend.modules.pages.schemas import (
    PageCreateRequest,
    PageUpdateRequest,
)
from backend.modules.shared.slug import RESERVED_SLUGS
from pydantic import BaseModel, ValidationError


def create_page(**overrides: object) -> PageCreateRequest:
    values = {
        "name": "Test Page",
        "visibility": PageVisibility.public,
        "slug": "test-page",
        "page_content": {},
        "owner": "test-user",
    }
    values.update(overrides)
    return PageCreateRequest(**values)


def update_page(**overrides: object) -> PageUpdateRequest:
    return PageUpdateRequest(**overrides)


ModelFactory = Callable[..., BaseModel]


@pytest.mark.parametrize("model_factory", [create_page, update_page])
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
    page = model_factory(slug=slug)
    assert page.slug == slug


@pytest.mark.parametrize("model_factory", [create_page, update_page])
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


@pytest.mark.parametrize("model_factory", [create_page, update_page])
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
        "pages",
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
        "my-pages",
        "pages-create",
    ],
)
def test_reserved_words_only_apply_to_exact_match(slug: str):
    page = create_page(slug=slug)
    assert page.slug == slug


def test_the_page_route_prefix_is_reserved():
    """`/p/$slug` cannot be shadowed, so `p` is reserved.

    Asserted on the set rather than through a schema, because the 3-50 char
    rule rejects a one-character slug before the reserved check ever runs.
    """
    assert "p" in RESERVED_SLUGS
    assert "communities" not in RESERVED_SLUGS
    assert "u" not in RESERVED_SLUGS
