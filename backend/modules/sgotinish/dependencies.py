from typing import Annotated

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.sgotinish.service import OtinishService
from fastapi import Depends


def get_otinish_service(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> OtinishService:
    return OtinishService(uow)
