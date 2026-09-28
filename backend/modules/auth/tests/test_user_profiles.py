"""Regression tests for the user profile page.

The first one is the load-bearing one: `upsert` used to copy `page_content={}`
and `is_page_public=False` over the row on every Keycloak callback, which
silently destroyed a user's designed page every time they signed in.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from backend.modules.auth.api import update_my_profile
from backend.modules.auth.models import UserRole, UserScope
from backend.modules.auth.profiles import UserPageService
from backend.modules.auth.repository import UserRepository
from backend.modules.auth.schemas import (
    UserPageResponse,
    UserPageUpdateRequest,
    UserSchema,
)
from backend.modules.auth.service import AuthService
from backend.modules.media.models import EntityType
from fastapi import HTTPException
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import IntegrityError


def _async_return(value):
    async def _call(*_args, **_kwargs):
        return value

    return _call


def _user(**overrides):
    values = {
        "id": 7,
        "sub": "user-1",
        "email": "u1@example.com",
        "name": "Ada",
        "surname": "Lovelace",
        "picture": None,
        "slug": "ada-lovelace",
        "page_content": {"root": {"props": {"title": "My Page"}}, "content": []},
        "is_page_public": True,
        "scope": UserScope.allowed,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def _session_returning(user):
    """A session whose `execute` yields `user` for the first (lookup) query."""
    session = MagicMock()
    result = MagicMock()
    result.scalars.return_value.first.return_value = user
    result.scalars.return_value.all.return_value = []
    session.execute = AsyncMock(return_value=result)
    session.flush = _async_return(None)
    session.refresh = _async_return(None)
    return session


def _uow_for(user, list_public=None):
    repo = MagicMock(spec=UserRepository)
    repo.get_by_sub = _async_return(user)
    repo.get_by_slug = _async_return(user)
    repo.get_by_id = _async_return(user)
    repo.list_media = _async_return([])
    repo.list_public = _async_return(list_public or ([], 0))

    uow = MagicMock()
    uow.get_repo = MagicMock(return_value=repo)
    uow.__aenter__ = _async_return(None)
    uow.__aexit__ = _async_return(False)
    return uow, repo


def _service(user, list_public=None):
    uow, repo = _uow_for(user, list_public)
    resolver = MagicMock()
    resolver.map_to_resources = AsyncMock(
        side_effect=lambda media_objects, resources: [[] for _ in resources]
    )
    return UserPageService(uow=uow, media_attachment_resolver=resolver), repo


# --------------------------------------------------------------------------
# 0.2 — the login landmine
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_upsert_preserves_user_owned_fields() -> None:
    """A login must not touch page_content, is_page_public or slug."""
    existing = _user()
    session = _session_returning(existing)

    await UserRepository(session).upsert(
        UserSchema(
            email="u1@example.com",
            role=UserRole.default,
            scope=UserScope.allowed,
            name="Ada Lovelace",
            surname="Byron",
            picture="https://example.com/new.png",
            sub="user-1",
        )
    )

    assert existing.page_content == {"root": {"props": {"title": "My Page"}}, "content": []}
    assert existing.is_page_public is True
    assert existing.slug == "ada-lovelace"
    # ...while the Keycloak-owned claims still land.
    assert existing.name == "Ada Lovelace"
    assert existing.picture == "https://example.com/new.png"


# --------------------------------------------------------------------------
# 1.2 — GET /u/{slug}
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_private_page_404s_for_a_stranger_and_a_guest_but_not_the_owner() -> None:
    service, _ = _service(_user(is_page_public=False))

    for viewer in ("someone-else", None):
        with pytest.raises(HTTPException) as excinfo:
            await service.get_page("ada-lovelace", viewer_sub=viewer)
        assert excinfo.value.status_code == 404

    owner_view = await service.get_page("ada-lovelace", viewer_sub="user-1")
    assert owner_view.sub == "user-1"
    assert owner_view.page_content["root"]["props"]["title"] == "My Page"


@pytest.mark.asyncio
async def test_banned_users_page_404s_for_a_stranger() -> None:
    service, _ = _service(_user(scope=UserScope.banned))

    with pytest.raises(HTTPException) as excinfo:
        await service.get_page("ada-lovelace", viewer_sub="someone-else")
    assert excinfo.value.status_code == 404


@pytest.mark.asyncio
async def test_unknown_slug_404s() -> None:
    service, _ = _service(None)

    with pytest.raises(HTTPException) as excinfo:
        await service.get_page("nobody", viewer_sub="user-1")
    assert excinfo.value.status_code == 404


# --------------------------------------------------------------------------
# 1.3 — GET /users
# --------------------------------------------------------------------------


def _compiled(sql) -> str:
    return str(sql.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))


@pytest.mark.asyncio
async def test_list_public_filters_visibility_in_sql_not_in_python() -> None:
    """The WHERE must hold the visibility filter even with no keyword given."""
    session = _session_returning(None)
    await UserRepository(session).list_public(page=1, size=20, keyword=None)

    sql = _compiled(session.execute.call_args_list[0].args[0])
    assert "users.is_page_public IS true" in sql
    assert "users.scope = 'allowed'" in sql


@pytest.mark.asyncio
async def test_list_public_orders_deterministically() -> None:
    """OFFSET over a non-deterministic order drops and repeats rows."""
    session = _session_returning(None)
    await UserRepository(session).list_public(page=2, size=10, keyword="ada")

    sql = _compiled(session.execute.call_args_list[0].args[0])
    assert "ORDER BY users.name ASC, users.surname ASC, users.sub ASC" in sql
    assert "LIMIT 10 OFFSET 10" in sql
    assert "ILIKE" in sql


@pytest.mark.asyncio
async def test_list_pages_envelope() -> None:
    rows = [_user(sub="a"), _user(sub="b")]
    service, _ = _service(_user(), list_public=(rows, 11))

    result = await service.list_pages(page=1, size=10)

    assert [item.sub for item in result.items] == ["a", "b"]
    assert (result.total, result.total_pages, result.has_next) == (11, 2, True)
    # The list carries no page content; only the single-page read does.
    assert not hasattr(result.items[0], "page_content")


@pytest.mark.asyncio
async def test_list_pages_reports_whether_a_design_exists() -> None:
    """The template dialog greys out a row with no design, and the list is the
    only thing it has to decide that from."""
    designed = _user(sub="a")
    designed.page_content = {"root": {"props": {"title": "Hi"}}, "content": [{"type": "Hero"}]}
    empty = _user(sub="b")
    empty.page_content = {"root": {"props": {"title": "Hi"}}, "content": []}
    service, _ = _service(_user(), list_public=([designed, empty], 2))

    result = await service.list_pages(page=1, size=10)

    assert [item.has_design for item in result.items] == [True, False]


# --------------------------------------------------------------------------
# 1.4 — PATCH /users/me
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_update_me_writes_the_session_user() -> None:
    user = _user()
    service, _ = _service(user)

    await service.update_me(
        new_data=UserPageUpdateRequest(slug="ada-l", is_page_public=False), session_sub="user-1"
    )

    assert (user.slug, user.is_page_public) == ("ada-l", False)


def test_update_me_rejects_another_users_sub() -> None:
    """There is no target sub to honour, so a body carrying one is refused
    outright instead of being quietly dropped."""
    with pytest.raises(ValueError):
        UserPageUpdateRequest(sub="user-2", is_page_public=True)


@pytest.mark.asyncio
async def test_duplicate_slug_surfaces_as_409() -> None:
    service = MagicMock()
    service.update_me = MagicMock(
        side_effect=IntegrityError("INSERT", {}, Exception("duplicate key"))
    )

    with pytest.raises(HTTPException) as excinfo:
        await update_my_profile(
            new_data=UserPageUpdateRequest(slug="taken"),
            user=({"sub": "user-1"}, {}),
            user_page_service=service,
        )
    assert excinfo.value.status_code == 409
    assert "already taken" in excinfo.value.detail


@pytest.mark.asyncio
async def test_authorize_user_media_upload_requires_ownership() -> None:
    service, _ = _service(_user(id=7, sub="user-1"))

    await service.authorize_user_media_upload(7, ({"sub": "user-1"}, {}))

    with pytest.raises(HTTPException) as excinfo:
        await service.authorize_user_media_upload(7, ({"sub": "user-2"}, {}))
    assert excinfo.value.status_code == 403


@pytest.mark.asyncio
async def test_authorize_user_media_upload_rejects_banned_and_unknown() -> None:
    banned, _ = _service(_user(id=7, sub="user-1", scope=UserScope.banned))
    with pytest.raises(HTTPException) as excinfo:
        await banned.authorize_user_media_upload(7, ({"sub": "user-1"}, {}))
    assert excinfo.value.status_code == 403

    missing, _ = _service(None)
    with pytest.raises(HTTPException) as excinfo:
        await missing.authorize_user_media_upload(7, ({"sub": "user-1"}, {}))
    assert excinfo.value.status_code == 404


def test_entity_type_has_a_users_value() -> None:
    assert EntityType.users.value == "users"


# --------------------------------------------------------------------------
# 2.3 — the session has to carry the surrogate id
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_me_carries_the_surrogate_user_id() -> None:
    """Media uploads address the user by `users.id`; `/me` is the only place
    the web client can learn it, and the public page must not expose it."""
    user = _user(id=42, department_id=3, telegram_id=None)
    uow, _ = _uow_for(user)
    service = AuthService(
        uow=uow,
        kc_manager=MagicMock(),
        app_token_manager=MagicMock(),
    )

    response = await service.get_current_user(
        {"sub": "user-1", "email": "u1@example.com"},
        {"sub": "user-1", "role": "default", "communities": []},
    )

    assert response.user["id"] == 42
    assert response.user["slug"] == "ada-lovelace"
    # Not leaked anywhere public.
    assert (
        "id" not in UserPageResponse(sub="user-1", name="Ada", surname="", slug="ada").model_dump()
    )
