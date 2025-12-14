from backend.modules.courses.courses.service import StudentCourseService
from backend.modules.courses.registrar.schemas import CourseSearchResponse, CourseSummary
import pytest


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


@pytest.mark.asyncio
async def test_get_or_create_course_searches_cross_list_parts():
    """
    Ensure _get_or_create_course tries split parts and reversed cross-listed codes
    if the full code does not match registrar results.
    """

    class FakeRegistrar:
        def __init__(self):
            self.calls: list[str] = []

        async def search_courses(self, request):
            self.calls.append(request.course_code)
            if request.course_code in ("WLL 235", "WCS 260/WLL 235"):
                return CourseSearchResponse(
                    items=[
                        CourseSummary(
                            registrar_id="9999",
                            course_code=request.course_code,
                            pre_req="",
                            anti_req="",
                            co_req="",
                            level="Undergraduate",
                            school="SSH",
                            description=None,
                            department="WLL",
                            title="Creative Writing",
                            credits="6",
                            term=request.term,
                        )
                    ]
                )
            return CourseSearchResponse(items=[])

        # Service now calls search_courses_pcc; delegate for compatibility.
        async def search_courses_pcc(self, request):
            return await self.search_courses(request)

    class FakeRepo:
        async def find_course_by_registrar_id(self, registrar_id: int):
            return None

        async def create_course(self, data):
            return {"created": True, "registrar_id": data.registrar_id}

    service = StudentCourseService(repository=FakeRepo(), registrar_service=FakeRegistrar())
    result = await service._get_or_create_course(
        course_code="WLL 235/WCS 260",
        term_value="822",
    )

    assert result == {"created": True, "registrar_id": 9999}

