from .admin.admin import get_admin
from .auth import auth
from .clubs import clubs
from backend.routes.bot.routes.bot import web_router

routers = [auth.router, clubs.router, web_router]
