from backend.routes.bot.bot import web_router

from .auth import auth
from .clubs import clubs
from .google_bucket import google_bucket
from .kupiprodai import product
from .review import review
from .search import search

routers = [
    auth.router,
    clubs.router,
    web_router,
    google_bucket.router,
    product.router,
    search.router,
    review.router,
]
