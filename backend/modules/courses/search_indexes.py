from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.core.database.models import Course, GradeReport

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=GradeReport,
        searchable_columns=[
            GradeReport.course_code,
            GradeReport.course_title,
            GradeReport.faculty,
            GradeReport.term,
        ],
        filterable_attributes=[GradeReport.term],
        primary_key=GradeReport.id,
    ),
    MeilisearchIndexConfig(
        model=Course,
        searchable_columns=[Course.course_code, Course.term],
        filterable_attributes=[Course.term],
        primary_key=Course.id,
    ),
]
