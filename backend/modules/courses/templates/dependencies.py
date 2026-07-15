from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from backend.modules.courses.templates.service import TemplateService


def get_template_service(db_session: AsyncSession = Depends(get_db_session)) -> TemplateService:
    return TemplateService(db_session)
