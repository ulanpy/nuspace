from contextlib import asynccontextmanager
from fastapi import FastAPI


from backend.routes import get_admin, auth, clubs
from backend.core.database.manager import AsyncDatabaseManager
from backend.core.configs.config import session_middleware_key
from backend.routes.auth.auth import KeyCloakManager
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        app.state.db_manager = AsyncDatabaseManager()
        app.state.kc_manager = KeyCloakManager()
        await app.state.db_manager.create_all_tables()
        print("Application startup: AsyncDatabaseManager initialized")
        routers = [auth.router, clubs.router]
        for router in routers:
            app.include_router(router)
        await get_admin(app)
        yield
    finally:
        await app.state.db_manager.async_engine.dispose()
        print("Application shutdown: Database engine disposed")


origins = [
    "*",
    "https://lh3.googleusercontent.com"
]