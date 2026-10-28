from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.courses.models import Course, GradeReport

GRADE_REPORTS_INDEX = MeilisearchIndexConfig(
    model=GradeReport,
    searchable_columns=[
        GradeReport.course_code,
        GradeReport.course_title,
        GradeReport.faculty,
        GradeReport.term,
    ],
    filterable_attributes=[GradeReport.term],
    primary_key=GradeReport.id,
)

COURSES_INDEX = MeilisearchIndexConfig(
    model=Course,
    searchable_columns=[Course.course_code, Course.term],
    filterable_attributes=[Course.term],
    primary_key=Course.id,
)

MEILISEARCH_INDEXES = [GRADE_REPORTS_INDEX, COURSES_INDEX]
