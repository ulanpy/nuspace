import importlib.util
from pathlib import Path

import httpx
import pytest

CLIENT_PATH = (
    Path(__file__).resolve().parents[1] / "clients" / "registrar_client.py"
)
spec = importlib.util.spec_from_file_location("registrar_client", CLIENT_PATH)
registrar_client = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(registrar_client)
RegistrarClient = registrar_client.RegistrarClient


@pytest.mark.asyncio
async def test_fetch_schedule_prefers_non_empty_reg(monkeypatch):
    client = RegistrarClient()
    calls: list[str] = []

    async def fake_login(username: str, password: str) -> None:
        calls.append(f"login:{username}:{password}")

    async def fake_get_schedule_access() -> dict:
        return {"reg": 1, "current": 1}

    async def fake_get_schedule(schedule_type: str) -> dict:
        calls.append(f"schedule:{schedule_type}")
        if schedule_type == "reg":
            return {"data": [{"COURSEID": "MATH162"}]}
        return {"data": []}

    async def fake_get_student_schedule_table(schedule_type: str) -> str:
        calls.append(f"table:{schedule_type}")
        return ""

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)
    monkeypatch.setattr(client, "_get_student_schedule_table", fake_get_student_schedule_table)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": [{"COURSEID": "MATH162"}], "student_schedule_table": ""}
    assert calls == ["login:student:secret", "schedule:reg", "table:reg"]


@pytest.mark.asyncio
async def test_fetch_schedule_falls_back_to_current_when_reg_is_empty(monkeypatch):
    client = RegistrarClient()
    calls: list[str] = []

    async def fake_login(username: str, password: str) -> None:
        calls.append(f"login:{username}:{password}")

    async def fake_get_schedule_access() -> dict:
        return {"reg": 1, "current": 1}

    async def fake_get_schedule(schedule_type: str) -> dict:
        calls.append(f"schedule:{schedule_type}")
        if schedule_type == "current":
            return {"data": [{"COURSEID": "CHEM211"}]}
        return {"data": []}

    async def fake_get_student_schedule_table(schedule_type: str) -> str:
        calls.append(f"table:{schedule_type}")
        return ""

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)
    monkeypatch.setattr(client, "_get_student_schedule_table", fake_get_student_schedule_table)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": [{"COURSEID": "CHEM211"}], "student_schedule_table": ""}
    assert calls == [
        "login:student:secret",
        "schedule:reg",
        "schedule:current",
        "table:current",
    ]


@pytest.mark.asyncio
async def test_fetch_schedule_skips_reg_when_not_accessible(monkeypatch):
    client = RegistrarClient()
    calls: list[str] = []

    async def fake_login(username: str, password: str) -> None:
        calls.append(f"login:{username}:{password}")

    async def fake_get_schedule_access() -> dict:
        return {"current": 1}

    async def fake_get_schedule(schedule_type: str) -> dict:
        calls.append(f"schedule:{schedule_type}")
        return {"data": []}

    async def fake_get_student_schedule_table(schedule_type: str) -> str:
        calls.append(f"table:{schedule_type}")
        return ""

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)
    monkeypatch.setattr(client, "_get_student_schedule_table", fake_get_student_schedule_table)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": [], "student_schedule_table": ""}
    assert calls == ["login:student:secret", "schedule:current", "table:current"]


@pytest.mark.asyncio
async def test_login_raises_unavailable_when_registrar_returns_500(monkeypatch):
    from backend.modules.courses.registrar.errors import RegistrarUnavailableError

    client = RegistrarClient()
    request = httpx.Request("POST", "https://registrar.nu.edu.kz/index.php")
    response = httpx.Response(500, request=request)

    class FakeClient:
        cookies = httpx.Cookies()

        async def post(self, *args, **kwargs):
            return response

    async def fake_ensure_client():
        return FakeClient()

    monkeypatch.setattr(client, "_ensure_client", fake_ensure_client)

    with pytest.raises(RegistrarUnavailableError, match="registrar_unavailable"):
        await client.login(username="student", password="secret")
