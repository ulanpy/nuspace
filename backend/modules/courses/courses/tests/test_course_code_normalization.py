from backend.modules.courses.courses.service import StudentCourseService


def test_normalize_course_code_spaces_cross_list_wcs_wll() -> None:
    assert (
        StudentCourseService._normalize_course_code("WCS260/WLL235")
        == "WCS 260/WLL 235"
    )


def test_normalize_course_code_spaces_cross_list_wll_ant() -> None:
    assert (
        StudentCourseService._normalize_course_code(" WLL171 / ANT175 ")
        == "WLL 171/ANT 175"
    )

