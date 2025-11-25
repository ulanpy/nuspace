from typing import List

from fastapi import APIRouter

from backend.modules.bot.bot import web_router

from .auth import auth
from .campuscurrent.communities import communities
from .campuscurrent.events import events
from .campuscurrent.profile import profile
from .google_bucket import google_bucket
from .courses.crashed import crashed
from .courses.student_courses import student_courses
from .courses.statistics import statistics
from .courses.templates import templates
from .notification import notification
from .search import search
from .sgotinish.tickets import tickets, delegation
from .sgotinish.conversations import conversations
from .sgotinish.messages import messages  
# Import all routers from the routes directory

routers: List[APIRouter] = [
    auth.router,
    communities.router,
    events.router,
    profile.router,
    search.router,
    google_bucket.router,
    web_router,
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
