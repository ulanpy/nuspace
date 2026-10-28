from fastapi import Depends

from backend.common.dependencies import get_uow
from backend.core.database.uow import UnitOfWork
from backend.modules.profiles.service import ProfileService


async def get_profile_service(uow: UnitOfWork = Depends(get_uow)) -> ProfileService:
    return ProfileService(uow=uow)
