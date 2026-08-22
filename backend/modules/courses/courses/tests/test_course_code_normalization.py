import pytest
from backend.modules.courses.courses.service import StudentCourseService
from backend.modules.courses.registrar.schemas import CatalogCourse


def test_normalize_course_code_spaces_cross_list_wcs_wll() -> None:
    assert StudentCourseService._normalize_course_code("WCS260/WLL235") == "WCS 260/WLL 235"


def test_normalize_course_code_spaces_cross_list_wll_ant() -> None:
    assert StudentCourseService._normalize_course_code(" WLL171 / ANT175 ") == "WLL 171/ANT 175"


@pytest.mark.asyncio
async def test_get_or_create_course_searches_cross_list_parts():
    """
    Ensure _get_or_create_course tries split parts and reversed cross-listed codes
    if the full code does not match registrar results.
    """

    class FakeRegistrar:
        def __init__(self):
            self.calls: list[str] = []

        async def find_catalog_course(self, *, course_code, term_value):
            self.calls.append(course_code)
            if course_code == "WLL 235":
                return CatalogCourse(
                    catalog_id="825-WLL-235",
                    course_code="WLL 235",
                    term="Fall 2026",
                    term_id=term_value,
                    title="Creative Writing",
                    level="Undergraduate",
                    school="SSH",
                    credits_ects=6,
                )
            return None

    class FakeRepo:
        last_data = None

        async def find_course_by_catalog_id(self, catalog_id: str):
            return None

        async def create_course(self, data):
            self.last_data = data
            return {"created": True, "catalog_id": data.catalog_id}

    class FakeUoW:
        def __init__(self):
            self.repo = FakeRepo()

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        def get_repo(self, _):
            return self.repo

    service = StudentCourseService(uow=FakeUoW(), registrar=FakeRegistrar())
    result = await service._get_or_create_course(
        course_code="WLL 235/WCS 260",
        term_value="822",
    )

    assert result == {"created": True, "catalog_id": "825-WLL-235"}
    assert service.uow.repo.last_data.credits == 6
