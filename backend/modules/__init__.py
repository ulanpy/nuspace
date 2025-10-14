from typing import List

from fastapi import APIRouter

from backend.modules.bot.bot import web_router

from .auth import auth
from .campuscurrent.comments import comments
from .campuscurrent.communities import communities
from .campuscurrent.events import events
from .campuscurrent.posts import posts
from .campuscurrent.profile import profile
from .campuscurrent.tags import tags
from .google_bucket import google_bucket
from .courses.crashed import crashed
from .courses.student_courses import student_courses
from .courses.statistics import statistics
from .courses.templates import templates
from .kupiprodai import product
from .notification import notification
from .review import reply, review
from .search import search
from .sgotinish.tickets import tickets, delegation
from .sgotinish.conversations import conversations
from .sgotinish.messages import messages  
# Import all routers from the routes directory

routers: List[APIRouter] = [
    auth.router,
    communities.router,
    events.router,
    posts.router,
    tags.router,
    comments.router,
    profile.router,
    product.router,
    search.router,
    google_bucket.router,
    web_router,
    review.router,
    reply.router,
    crashed.router,
    student_courses.router,
    statistics.router,
    templates.router,
    notification.router,
    tickets.router,
    conversations.router,
    messages.router,
    delegation.router,
]
