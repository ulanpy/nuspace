from backend.routes.bot.bot import web_router

from .admin.admin import get_admin
from .auth import auth
from .clubs import clubs
from .google_bucket import google_bucket
from .kupiprodai import product

# FastAPI routers
routers = [auth.router, clubs.router, web_router, google_bucket.router, product.router]
