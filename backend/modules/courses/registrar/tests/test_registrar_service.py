import pytest

from backend.modules.courses.registrar import service as registrar_service
from backend.modules.courses.registrar.service import RegistrarService


@pytest.mark.asyncio
async def test_fetch_course_priorities_returns_exact_match(monkeypatch):
    service = RegistrarService(meilisearch_client=object())

    async def fake_get(*args, **kwargs):
        return {
            "hits": [
                {
                    "abbr": "MATH 263",
                    "prerequisite": "Wrong prereq",
                    "corequisite": "",
                    "antirequisite": "",
                    "priority_1": "",
                    "priority_2": "",
                    "priority_3": "",
                    "priority_4": "",
                },
                {
                    "abbr": "MATH 162",
                    "prerequisite": "Correct prereq",
                    "corequisite": "",
                    "antirequisite": "",
                    "priority_1": "",
                    "priority_2": "",
                    "priority_3": "",
                    "priority_4": "",
                },
            ]
        }

    monkeypatch.setattr(registrar_service.meilisearch_utils, "get", fake_get)

    result = await service.fetch_course_priorities(["MATH 162"])

    assert "MATH162" in result
    assert result["MATH162"].prerequisite == "Correct prereq"


@pytest.mark.asyncio
async def test_fetch_course_priorities_returns_empty_without_exact_match(monkeypatch):
    service = RegistrarService(meilisearch_client=object())

    async def fake_get(*args, **kwargs):
        return {
            "hits": [
                {
                    "abbr": "MATH 263",
                    "prerequisite": "Wrong prereq",
                }
            ]
        }

    monkeypatch.setattr(registrar_service.meilisearch_utils, "get", fake_get)

    result = await service.fetch_course_priorities(["MATH 162"])

    assert result == {}

