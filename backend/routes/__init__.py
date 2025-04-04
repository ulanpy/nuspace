from .admin.admin import get_admin
from .auth import auth
from .clubs import clubs
from backend.routes.bot.bot import web_router
from .google_bucket import google_bucket

# FastAPI routers
routers = [auth.router, clubs.router, web_router, google_bucket.router]
__all__ = ["get_admin", "auth", "clubs"]  # This defines what gets imported
