from typing import List

from fastapi import APIRouter

from backend.modules.bot.bot import web_router
from backend.modules.auth import api as auth_api
from backend.modules.campuscurrent.communities import api as communities_api
from backend.modules.campuscurrent.communities import og as communities_og
from backend.modules.campuscurrent.events import api as events_api
from backend.modules.campuscurrent.events import og as events_og
from backend.modules.campuscurrent.profile import api as profile_api
from backend.modules.google_bucket import api as google_bucket_api
from backend.modules.courses.courses import api as courses_api
from backend.modules.courses.planner import api as planner_api
from backend.modules.courses.statistics import api as statistics_api
from backend.modules.courses.templates import api as templates_api
from backend.modules.courses.degree_audit import api as degree_audit_api
from backend.modules.notification import api as notification_api
from backend.modules.search import api as search_api
from backend.modules.sgotinish.tickets import api as tickets_api
from backend.modules.sgotinish.delegation import api as delegation_api
from backend.modules.sgotinish.conversations import api as conversations_api
from backend.modules.sgotinish.messages import api as messages_api
from backend.modules.announcements import api as announcements_api
from backend.modules.opportunities import api as opportunities_api
from backend.modules.elections import api as elections_api

routers: List[APIRouter] = [
    auth_api.router,
    communities_api.router,
    communities_og.router,
    events_api.router,
    events_og.router,
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
    elections_api.router,
]
