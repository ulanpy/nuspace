import pytest

from backend.modules.courses.registrar import service as registrar_service
from backend.modules.courses.registrar.service import RegistrarService


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ("WCS 210", "WCS 210", True),
        ("WCS 210", "WCS 210/ASC 200", True),
        ("ASC 200", "WCS 210/ASC 200", True),
        ("WCS 210/ASC 200", "ASC 200/WCS 210", True),
        ("wcs210", "WCS 210 / ASC 200", True),
        ("WCS 210", "WCS 150/ASC 100", False),
        ("ECON 201", "ECON 211", False),
        ("", "WCS 210", False),
        (None, "WCS 210", False),
    ],
)
def test_course_codes_match_cross_lists(left, right, expected) -> None:
    assert RegistrarService.course_codes_match(left, right) is expected


@pytest.mark.asyncio
async def test_schedule_sections_match_cross_listed_catalog_code(monkeypatch):
    service = RegistrarService(meilisearch_client=object())

    async def fake_get(*args, **kwargs):
        return {
            "hits": [
                {
                    "course_code": "WCS 210/ASC 200",
                    "term_id": "825",
                    "term": "Fall 2026",
                    "sections": [
                        {
                            "section_code": "1L",
                            "days": "MWF",
                            "time": "10:00-10:50",
                            "room": "8.105",
                            "faculty": "Doe",
                            "capacity": 30,
                            "enrollment": 10,
                        }
                    ],
                }
            ]
        }

    monkeypatch.setattr(registrar_service.meilisearch_utils, "get", fake_get)

    sections = await service.get_course_schedule(course_code="WCS 210", term="825")

    assert len(sections) == 1
    assert sections[0].section_code == "1L"


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

