from .admin.admin import get_admin
from .auth import auth
from .clubs import clubs
from .kupiprodai import product
from backend.routes.bot.bot import web_router
from .google_bucket import google_bucket
from .magnum import grocery  

# FastAPI routers
routers = [auth.router, clubs.router, web_router, google_bucket.router, grocery.router]
__all__ = ["get_admin", "auth", "clubs", "product", "grocery"]  # This defines what gets imported
