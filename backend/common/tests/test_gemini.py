"""The shared Gemini client constructor, below the HTTP seam."""

from types import SimpleNamespace

import pytest
from backend.common import gemini


@pytest.fixture
def client_calls(monkeypatch: pytest.MonkeyPatch) -> list[dict]:
    calls: list[dict] = []
    monkeypatch.setattr(gemini.genai, "Client", lambda **kwargs: calls.append(kwargs) or kwargs)
    return calls


def _config(**overrides) -> SimpleNamespace:
    values = {
        "gemini_use_enterprise": False,
        "GEMINI_API_KEY": None,
        "GCP_PROJECT_ID": "nuspace-project",
        "GEMINI_LOCATION": "global",
    }
    return SimpleNamespace(**{**values, **overrides})


def test_enterprise_uses_the_project_and_location_with_no_key(client_calls):
    gemini.build_gemini_client(_config(gemini_use_enterprise=True, GEMINI_API_KEY="ignored"))
    assert client_calls == [
        {"enterprise": True, "project": "nuspace-project", "location": "global"}
    ]


def test_developer_api_uses_the_key(client_calls):
    gemini.build_gemini_client(_config(GEMINI_API_KEY="k"))
    assert client_calls == [{"api_key": "k"}]


def test_developer_api_without_a_key_is_an_error(client_calls):
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        gemini.build_gemini_client(_config())
    assert client_calls == []
