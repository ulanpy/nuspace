from typing import Annotated

from backend.common.dependencies import get_db_session
from backend.modules.sgotinish.service import OtinishService
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession


def get_otinish_service(
    db_session: Annotated[AsyncSession, Depends(get_db_session)],
) -> OtinishService:
    return OtinishService(db_session)
