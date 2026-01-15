from typing import List

from fastapi import APIRouter

from backend.modules.bot.bot import web_router

from .auth import auth
from .campuscurrent.communities import api as communities_api
from .campuscurrent.events import api as events_api
from .campuscurrent.profile import api as profile_api
from .google_bucket import api as google_bucket_api
from .courses.courses import api as courses_api
from .courses.planner import api as planner_api
from .courses.statistics import api as statistics_api
from .courses.templates import api as templates_api
from .courses.degree_audit import api as degree_audit_api
from .notification import api as notification_api
from .search import api as search_api
from .sgotinish.tickets import tickets_api, delegation_api
from .sgotinish.conversations import api as conversations_api
from .sgotinish.messages import api as messages_api
from .announcements import api as announcements_api
from .opportunities import api as opportunities_api
from .rejection_board import api as rejection_board_api
# Import all routers from the routes directory

routers: List[APIRouter] = [
    auth.router,
    communities_api.router,
    events_api.router,
    profile_api.router,
    search_api.router,
    google_bucket_api.router,
    web_router,
    courses_api.router,
    planner_api.router,
    statistics_api.router,
    templates_api.router,
    degree_audit_api.router,
    notification_api.router,
    tickets_api.router,
    conversations_api.router,
    messages_api.router,
    delegation_api.router,
    announcements_api.router,
    opportunities_api.router,
    rejection_board_api.router,
]
