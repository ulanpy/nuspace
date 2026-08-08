from fastapi import Depends
from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.courses.templates.service import TemplateService


def get_template_service(uow: UnitOfWork = Depends(get_uow)) -> TemplateService:
    return TemplateService(uow)
