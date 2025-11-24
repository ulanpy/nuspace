from backend.modules.courses.student_courses.service import StudentCourseService


def test_normalize_course_code_trims_and_uppercases() -> None:
    assert (
        StudentCourseService._normalize_course_code("  wll   235  ")
        == "WLL 235"
    )


def test_expand_course_code_aliases_handles_slash_delimited_codes() -> None:
    aliases = StudentCourseService._expand_course_code_aliases("WLL 235 / WCS 260")
    assert aliases == ["WLL 235/WCS 260", "WCS 260/WLL 235", "WLL 235", "WCS 260"]


def test_expand_course_code_aliases_ignores_empty_segments() -> None:
    aliases = StudentCourseService._expand_course_code_aliases("CSCI 231///")
    assert aliases == ["CSCI 231", ]


def test_expand_course_code_aliases_handles_multiple_separators() -> None:
    aliases = StudentCourseService._expand_course_code_aliases("abc 123 / def 456 / ghi 789")
    assert "GHI 789/DEF 456/ABC 123" in aliases

