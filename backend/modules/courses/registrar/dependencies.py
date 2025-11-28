from fastapi import Depends

from backend.common.dependencies import get_creds_or_401
from backend.modules.courses.registrar.service import RegistrarService


def get_registrar_service() -> RegistrarService:
    return RegistrarService()

