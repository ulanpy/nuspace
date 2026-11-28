from backend.modules.courses.models import GradeReport
from backend.modules.courses.search_indexes import MEILISEARCH_INDEXES


def test_grade_report_index_does_not_use_distinct_attribute() -> None:
    grade_reports_index = next(
        config for config in MEILISEARCH_INDEXES if config.model is GradeReport
    )
    assert grade_reports_index.distinct_attribute is None
