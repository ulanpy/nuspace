from typing import List

from fastapi import APIRouter

from backend.routes.bot.bot import web_router

from .auth import auth
from .communities import communities, events
from .google_bucket import google_bucket
from .kupiprodai import product
from .review import reply, review
from .search import search

# Import all routers from the routes directory
routers: List[APIRouter] = [
    auth.router,
    communities.router,
    events.router,
    product.router,
    search.router,
    google_bucket.router,
    web_router,
    review.router,
    reply.router,
]
