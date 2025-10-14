from fastapi import Depends

from backend.common.dependencies import get_creds_or_401
from backend.modules.courses.crashed.service import RegistrarService


def get_registrar_service() -> RegistrarService:
    return RegistrarService()


async def get_registrar_username(
    user: tuple[dict, dict] = Depends(get_creds_or_401),
) -> str:
    email: str = user[0]["email"]
    return email.split("@", maxsplit=1)[0]

