from unittest.mock import AsyncMock

import pytest
from backend.modules.courses.courses.api import sync_courses_from_registrar
from backend.modules.courses.courses.schemas import RegistrarSyncRequest
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_debug_sync_without_username_returns_503_before_service_call(monkeypatch):
    from backend.modules.courses.courses import api

    monkeypatch.setattr(api.config, "IS_DEBUG", True)
    monkeypatch.setattr(api.config, "REGISTRAR_DEBUG_USERNAME", "   ")
    service = AsyncMock()

    with pytest.raises(HTTPException) as raised:
        await sync_courses_from_registrar(
            data=RegistrarSyncRequest(password="real-password"),
            user=({"sub": "mock-user"}, {}),
            service=service,
        )

    assert raised.value.status_code == 503
    service.sync_courses_from_registrar.assert_not_awaited()
