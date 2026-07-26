import importlib.util
from pathlib import Path
from types import SimpleNamespace

import pytest

CLIENT_PATH = Path(__file__).resolve().parents[1] / "clients" / "registrar_client.py"
spec = importlib.util.spec_from_file_location("registrar_client", CLIENT_PATH)
registrar_client = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(registrar_client)
RegistrarClient = registrar_client.RegistrarClient
InvalidRegistrarCredentials = registrar_client.InvalidRegistrarCredentials
RegistrarLoginUnconfirmed = registrar_client.RegistrarLoginUnconfirmed


class LoginResponse:
    status_code = 200

    def __init__(self, text: str):
        self.text = text

    def raise_for_status(self) -> None:
        raise AssertionError("raise_for_status should not be called")


class LoginHttpClient:
    def __init__(self, text: str, cookie_names: tuple[str, ...] = ()):
        self.response = LoginResponse(text)
        self.cookies = SimpleNamespace(jar=[SimpleNamespace(name=name) for name in cookie_names])

    async def post(self, *args, **kwargs):
        return self.response


def install_login_client(monkeypatch, registrar, fake_http_client):
    async def fake_ensure_client():
        return fake_http_client

    monkeypatch.setattr(registrar, "_ensure_client", fake_ensure_client)


@pytest.mark.asyncio
async def test_login_recognizes_explicitly_rejected_credentials(monkeypatch):
    client = RegistrarClient()
    install_login_client(
        monkeypatch,
        client,
        LoginHttpClient("Unrecognized username or password."),
    )

    with pytest.raises(InvalidRegistrarCredentials):
        await client.login("student", "wrong")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("body", "cookies"),
    [
        ("Welcome", ("AUTHSSL",)),
        ('<a href="/user/logout">Log out</a>', ()),
    ],
)
async def test_login_accepts_session_or_logout_success_signals(monkeypatch, body, cookies):
    client = RegistrarClient()
    install_login_client(monkeypatch, client, LoginHttpClient(body, cookies))

    await client.login("student", "correct")


@pytest.mark.asyncio
async def test_login_reports_an_unconfirmed_page_change(monkeypatch):
    client = RegistrarClient()
    install_login_client(
        monkeypatch,
        client,
        LoginHttpClient("<html>Unexpected login response</html>"),
    )

    with pytest.raises(RegistrarLoginUnconfirmed):
        await client.login("student", "correct")


@pytest.mark.asyncio
async def test_fetch_schedule_prefers_non_empty_current(monkeypatch):
    client = RegistrarClient()
    calls: list[str] = []

    async def fake_login(username: str, password: str) -> None:
        calls.append(f"login:{username}:{password}")

    async def fake_get_schedule_access() -> dict:
        return {"reg": 1, "current": 1}

    async def fake_get_schedule(schedule_type: str) -> dict:
        calls.append(f"schedule:{schedule_type}")
        if schedule_type == "current":
            return {"data": [{"COURSEID": "MATH162"}]}
        return {"data": []}

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": [{"COURSEID": "MATH162"}]}
    assert calls == ["login:student:secret", "schedule:current"]


@pytest.mark.asyncio
async def test_fetch_schedule_falls_back_to_reg_when_current_empty(monkeypatch):
    client = RegistrarClient()
    calls: list[str] = []

    async def fake_login(username: str, password: str) -> None:
        calls.append(f"login:{username}:{password}")

    async def fake_get_schedule_access() -> dict:
        return {"reg": 1}

    async def fake_get_schedule(schedule_type: str) -> dict:
        calls.append(f"schedule:{schedule_type}")
        if schedule_type == "reg":
            return {"data": [{"COURSEID": "CHEM211"}]}
        return {"data": []}

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": [{"COURSEID": "CHEM211"}]}
    assert calls == ["login:student:secret", "schedule:current", "schedule:reg"]


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

    monkeypatch.setattr(client, "login", fake_login)
    monkeypatch.setattr(client, "_get_schedule_access", fake_get_schedule_access)
    monkeypatch.setattr(client, "_get_schedule", fake_get_schedule)

    result = await client.fetch_schedule(username="student", password="secret")

    assert result == {"data": []}
    assert calls == ["login:student:secret", "schedule:current"]
