from types import SimpleNamespace

import pytest
from backend.modules.courses.models import GradeReport
from backend.modules.courses.search_indexes import MEILISEARCH_INDEXES
from backend.modules.media.models import EntityType
from backend.modules.search import api


@pytest.mark.asyncio
async def test_grade_report_suggestions_dedupe_without_index_distinct(monkeypatch) -> None:
    calls: list[int] = []

    async def search(*, page: int, **_kwargs):
        calls.append(page)
        return {
            "hits": [
                {"id": 1, "course_code": "CS 101", "course_title": "Programming", "term": "FA2025"},
                {"id": 2, "course_code": "CS 101", "course_title": "Programming", "term": "SP2026"},
                {"id": 3, "course_code": "CS 102", "course_title": "Algorithms", "term": "FA2025"},
            ],
            "estimatedTotalHits": 3,
        }

    monkeypatch.setattr(api.meilisearch, "get", search)
    request = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(meilisearch_client=object()))
    )

    hits = await api.full_search(
        request=request,
        keyword="CS",
        storage_name=EntityType.grade_reports,
        _user=({}, {}),
        page=1,
        size=2,
    )

    assert [hit["id"] for hit in hits] == [1, 3]
    assert calls == [1]
    grade_reports_index = next(
        config for config in MEILISEARCH_INDEXES if config.model is GradeReport
    )
    assert grade_reports_index.distinct_attribute is None
