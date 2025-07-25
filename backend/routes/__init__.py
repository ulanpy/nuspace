from typing import List

from fastapi import APIRouter

from backend.routes.bot.bot import web_router

from .auth import auth
from .communities.comments import comments
from .communities.communities import communities
from .communities.events import events
from .communities.posts import posts
from .communities.tags import tags
from .google_bucket import google_bucket
from .kupiprodai import product
from .notification import notification
from .review import reply, review
from .search import search

# Import all routers from the routes directory
routers: List[APIRouter] = [
    auth.router,
    communities.router,
    events.router,
    posts.router,
    tags.router,
    comments.router,
    product.router,
    search.router,
    google_bucket.router,
    web_router,
    review.router,
    reply.router,
    comments.router,
    posts.router,
    notification.router,
]
