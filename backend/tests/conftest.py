import asyncio
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.core.database.models.base import Base

# Add the project root directory to Python path
# what it does is it adds the project root directory to the Python path
# so that the tests can import the project modules without having to use the full path
project_root = str(Path(__file__).parent.parent.parent)
sys.path.insert(0, project_root)


# Test database URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"  # in memory


@pytest.fixture(
    scope="session"
)  # scope session means that the fixture will be created once for the entire session
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(
    scope="session"
)  # pytest_asyncio is a pytest plugin that allows you to write async fixtures
async def test_engine():
    """Create a test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_engine):
    """Create a test database session."""
    async_session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        print("test_db_session created")
        yield session


@pytest_asyncio.fixture
async def client(test_db_session):
    from fastapi import FastAPI

    from backend.common.dependencies import get_creds_or_401, get_db_session
    from backend.lifespan import lifespan
    from backend.routes import routers

    app = FastAPI(lifespan=lifespan, root_path="/api")
    for router in routers:
        app.include_router(router)

    async def override_get_db():
        yield test_db_session

    app.dependency_overrides[get_db_session] = override_get_db

    async def override_get_creds_or_401(request=None, response=None, db_session=None):
        return (
            {"sub": "test_user_id", "email": "test@example.com"},
            {"role": "default", "sub": "test_user_id"},
        )

    app.dependency_overrides[get_creds_or_401] = override_get_creds_or_401
    client = TestClient(app, base_url="http://test/api")
    client.cookies.set("access_token", "test")
    client.cookies.set("refresh_token", "test")
    print("client created")
    yield client


# Mock dependencies
@pytest.fixture
def mock_get_creds_or_401():
    """Mock the get_creds_or_401 dependency."""
    with patch("backend.routes.kupiprodai.product.get_creds_or_401") as mock:
        mock.return_value = ({"sub": "test_user_id", "email": "test@example.com"}, {"role": "user"})
        yield mock


@pytest.fixture
def mock_check_tg():
    """Mock the check_tg dependency."""
    with patch("backend.routes.kupiprodai.product.check_tg") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def mock_meilisearch():
    """Mock the meilisearch client."""
    with patch("backend.routes.kupiprodai.product.meilisearch") as mock:
        mock.upsert = AsyncMock()
        mock.get = AsyncMock()
        mock.delete = AsyncMock()
        yield mock
