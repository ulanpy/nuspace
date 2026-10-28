"""The HTTP-seam harness: the real app, real stores, one client per viewer kind.

Loaded for every test by the root `conftest.py`. Nothing here starts until a
test asks for one of its fixtures, so tests that mock below the service never
need the stores. How to run it and how to write a test: `tests/README.md`.

The app is `backend.main.app`, started once per session through its own
lifespan, with Postgres and Meilisearch real. The lifespan's other boundaries
(RabbitMQ, GCS, the Telegram bot, the profiler, the registrar catalog pulled
from GCS) are swapped for inert stand-ins in `_BOUNDARY_FAKES`. Keycloak is
faked by the app's own `MOCK_KEYCLOAK` path: each viewer carries the cookies
the mock login would have set.
"""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from google.auth.credentials import AnonymousCredentials
from google.cloud import storage
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.common.utils import meilisearch
from backend.core.configs.config import config
from backend.modules.auth import mock as mock_keycloak
from backend.modules.auth.models import User, UserRole, UserScope
from backend.modules.pages.models import Page, PageAdmin, PageVisibility

BACKEND_DIR = Path(__file__).resolve().parents[1]

# Production's origin. The auth cookies are `Secure` outside debug, and httpx
# only sends a `Secure` cookie back over https.
BASE_URL = "https://nuspace.kz"

STORES_DOWN = (
    "The test stores are not running. Start them from the repo root with\n"
    "    docker compose -f infra/test.docker-compose.yml up -d --wait"
)


# --- Viewers -----------------------------------------------------------------


@dataclass(frozen=True)
class Persona:
    """A signed-in viewer kind: who Keycloak says they are, and their `users` row."""

    kind: str
    role: UserRole = UserRole.default
    scope: UserScope = UserScope.allowed

    @property
    def sub(self) -> str:
        return f"test-{self.kind.replace('_', '-')}"

    @property
    def userinfo(self) -> dict:
        """The shape of an entry in `auth.mock.MOCK_USERS`."""
        return {
            "email": f"{self.sub}@nu.edu.kz",
            "given_name": self.kind.replace("_", " ").title(),
            "family_name": "Test",
            "picture": "",
            "sub": self.sub,
        }


# `owner` and `page_admin` are ordinary members until a Page names them:
# pass them to `make_page(owner=..., admins=[...])`.
PERSONAS = {
    persona.kind: persona
    for persona in (
        Persona("member"),
        Persona("banned_member", scope=UserScope.banned),
        Persona("owner"),
        Persona("page_admin"),
        Persona("site_admin", role=UserRole.admin),
    )
}

# Every viewer kind of the visibility matrix, for `pytest.mark.parametrize`
# over the `viewers` fixture.
VIEWER_KINDS = ("guest", *PERSONAS)


@dataclass(frozen=True)
class Viewer:
    """A client already signed in as one viewer kind (`sub` is None for the guest)."""

    kind: str
    client: httpx.AsyncClient
    sub: str | None = None


# --- Boundaries --------------------------------------------------------------


def _fake_setup_gcp(app: FastAPI) -> None:
    # A real client that is never called: building one makes no request.
    app.state.storage_client = storage.Client(
        project=config.GCP_PROJECT_ID, credentials=AnonymousCredentials()
    )


async def _fake_setup_rbq(app: FastAPI) -> None:
    # The app's broker object, never connected, so a publish fails loudly. Fake
    # the publish at its client when the first test that needs one is written.
    from backend.bootstrap import rbq

    app.state.broker = rbq.broker


async def _fake_cleanup_rbq(app: FastAPI) -> None:
    app.state.broker = None


async def _fake_setup_bot(app: FastAPI) -> None:
    app.state.bot = None
    app.state.dp = None
    app.state.bot_username = None


async def _fake_cleanup_bot(app: FastAPI) -> None:
    return None


async def _fake_setup_schedule_catalog(app: FastAPI) -> None:
    app.state.active_registrar_semester = None


_BOUNDARY_FAKES = {
    "setup_pyroscope": lambda: False,
    "setup_gcp": _fake_setup_gcp,
    "setup_rbq": _fake_setup_rbq,
    "cleanup_rbq": _fake_cleanup_rbq,
    "setup_bot": _fake_setup_bot,
    "cleanup_bot": _fake_cleanup_bot,
    "setup_schedule_catalog": _fake_setup_schedule_catalog,
}


# --- Stores ------------------------------------------------------------------


@dataclass(frozen=True)
class _Database:
    # Tables a migration fills (reference data such as `sg_ministries`): kept
    # between tests. Every other table is emptied before each test.
    emptied_tables: tuple[str, ...]


def _require_stores(engine: Engine) -> None:
    """Fail every test that needs the stores with how to start them."""
    error: Exception | None = None
    try:
        with engine.connect():
            pass
        httpx.get(f"{config.MEILISEARCH_URL}/health", timeout=2).raise_for_status()
    except (OperationalError, httpx.HTTPError) as exc:
        error = exc
    if error is not None:
        pytest.fail(f"{STORES_DOWN}\n\n{error}", pytrace=False)


@pytest.fixture(scope="session")
def _database() -> _Database:
    """Rebuild the test database from the migrations, once per session."""
    engine = create_engine(config.DATABASE_URL.replace("+asyncpg", ""))
    _require_stores(engine)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))

    command.upgrade(AlembicConfig(str(BACKEND_DIR / "alembic.ini")), "head")

    with engine.connect() as conn:
        tables = conn.execute(
            text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
        ).scalars()
        emptied = tuple(
            table
            for table in sorted(tables)
            if table != "alembic_version"
            and not conn.execute(text(f'SELECT EXISTS (SELECT FROM "{table}")')).scalar()
        )
    engine.dispose()
    return _Database(emptied_tables=emptied)


@pytest_asyncio.fixture(scope="session")
async def app(_database: _Database) -> AsyncIterator[FastAPI]:
    """`backend.main.app`, started once through its own lifespan."""
    # Imported here, not at the top: the routers import most of the backend,
    # which tests that never touch the app should not pay for.
    from backend import lifespan as app_lifespan
    from backend.bootstrap.meilisearch import ensure_indexes
    from backend.bootstrap.search_indexes import ALL_MEILISEARCH_INDEXES
    from backend.main import app

    with pytest.MonkeyPatch.context() as mp:
        for name, fake in _BOUNDARY_FAKES.items():
            mp.setattr(app_lifespan, name, fake)
        mp.setattr(
            mock_keycloak,
            "MOCK_USERS",
            [*mock_keycloak.MOCK_USERS, *(p.userinfo for p in PERSONAS.values())],
        )
        async with app.router.lifespan_context(app):
            # The app creates missing indexes in the background at boot, and only
            # that: it never fills them. A test must not depend on that task, so
            # the harness creates and configures every index itself. Idempotent,
            # so it may overlap the boot task.
            await ensure_indexes(app.state.meilisearch_client, ALL_MEILISEARCH_INDEXES)
            yield app


@pytest_asyncio.fixture
async def db(app: FastAPI, _database: _Database) -> async_sessionmaker[AsyncSession]:
    """The app's own session factory, over stores emptied for this test.

    Every fixture that reaches the app depends on this one, so each test
    starts from the migrated database and empty search indexes. Arrange data
    with `async with db.begin() as session: ...`, which commits on exit.
    """
    if _database.emptied_tables:
        tables = ", ".join(f'"{table}"' for table in _database.emptied_tables)
        async with app.state.db_manager.async_engine.begin() as conn:
            await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY"))

    client = app.state.meilisearch_client
    indexes = (await client.get("/indexes", params={"limit": 1000})).json()["results"]
    for index in indexes:
        response = await client.delete(f"/indexes/{index['uid']}/documents")
        await meilisearch.wait_for_task(client, response)

    return app.state.db_manager.get_session_maker()


def _client(app: FastAPI, cookies: dict[str, str] | None = None) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url=BASE_URL, cookies=cookies
    )


async def _signed_in(
    app: FastAPI, db: async_sessionmaker[AsyncSession], persona: Persona
) -> AsyncIterator[Viewer]:
    # The `users` row first: the app keeps an existing row's role and scope.
    async with db.begin() as session:
        session.add(
            User(
                sub=persona.sub,
                email=persona.userinfo["email"],
                name=persona.userinfo["given_name"],
                surname=persona.userinfo["family_name"],
                picture=persona.userinfo["picture"],
                role=persona.role,
                scope=persona.scope,
            )
        )
    # The cookies the mock Keycloak login sets (`auth/service.py`, callback).
    creds = mock_keycloak.build_mock_creds(persona.userinfo)
    cookies = {
        config.COOKIE_ACCESS_NAME: creds["access_token"],
        config.COOKIE_REFRESH_NAME: creds["refresh_token"],
    }
    async with _client(app, cookies) as client:
        yield Viewer(kind=persona.kind, client=client, sub=persona.sub)


@pytest_asyncio.fixture
async def guest(app: FastAPI, db: async_sessionmaker[AsyncSession]) -> AsyncIterator[Viewer]:
    """No cookies at all, so the app builds the guest principal production does."""
    async with _client(app) as client:
        yield Viewer(kind="guest", client=client)


@pytest_asyncio.fixture
async def member(app: FastAPI, db: async_sessionmaker[AsyncSession]) -> AsyncIterator[Viewer]:
    async for viewer in _signed_in(app, db, PERSONAS["member"]):
        yield viewer


@pytest_asyncio.fixture
async def banned_member(
    app: FastAPI, db: async_sessionmaker[AsyncSession]
) -> AsyncIterator[Viewer]:
    async for viewer in _signed_in(app, db, PERSONAS["banned_member"]):
        yield viewer


@pytest_asyncio.fixture
async def owner(app: FastAPI, db: async_sessionmaker[AsyncSession]) -> AsyncIterator[Viewer]:
    async for viewer in _signed_in(app, db, PERSONAS["owner"]):
        yield viewer


@pytest_asyncio.fixture
async def page_admin(app: FastAPI, db: async_sessionmaker[AsyncSession]) -> AsyncIterator[Viewer]:
    async for viewer in _signed_in(app, db, PERSONAS["page_admin"]):
        yield viewer


@pytest_asyncio.fixture
async def site_admin(app: FastAPI, db: async_sessionmaker[AsyncSession]) -> AsyncIterator[Viewer]:
    async for viewer in _signed_in(app, db, PERSONAS["site_admin"]):
        yield viewer


@pytest.fixture
def viewers(
    guest: Viewer,
    member: Viewer,
    banned_member: Viewer,
    owner: Viewer,
    page_admin: Viewer,
    site_admin: Viewer,
) -> dict[str, Viewer]:
    """All six viewer kinds by name, for a matrix parametrized over `VIEWER_KINDS`.

    Use this rather than `request.getfixturevalue(kind)`, which cannot start
    an async fixture from inside a running async test.
    """
    return {
        viewer.kind: viewer
        for viewer in (guest, member, banned_member, owner, page_admin, site_admin)
    }


@pytest.fixture
def search_settled(app: FastAPI) -> Callable[[], Awaitable[None]]:
    """Wait until Meilisearch has applied every write the app has sent it.

    The app indexes without waiting, so a test that writes over HTTP and then
    searches must wait first. This is the only synchronisation the harness does
    for search; it does not index anything itself.
    """

    async def _settled() -> None:
        client = app.state.meilisearch_client
        deadline = asyncio.get_running_loop().time() + 30
        while True:
            pending = await client.get(
                "/tasks", params={"statuses": "enqueued,processing", "limit": 1}
            )
            if pending.json()["total"] == 0:
                return
            if asyncio.get_running_loop().time() > deadline:
                raise TimeoutError("Meilisearch still has pending tasks")
            await asyncio.sleep(0.05)

    return _settled


# --- Data --------------------------------------------------------------------


@pytest.fixture
def make_page(db: async_sessionmaker[AsyncSession]) -> Callable[..., Awaitable[Page]]:
    """Store a Page directly, as `POST /pages` would have. It is not indexed."""

    async def _make_page(
        *,
        owner: Viewer | None,
        admins: tuple[Viewer, ...] = (),
        visibility: PageVisibility = PageVisibility.public,
        slug: str = "test-page",
        name: str = "Test Page",
        description: str | None = None,
        page_content: dict | None = None,
    ) -> Page:
        async with db.begin() as session:
            page = Page(
                name=name,
                description=description,
                visibility=visibility,
                owner=owner.sub if owner else None,
                slug=slug,
                page_content=page_content or {},
            )
            session.add(page)
            await session.flush()
            session.add_all(PageAdmin(page_id=page.id, user_sub=admin.sub) for admin in admins)
        return page

    return _make_page
