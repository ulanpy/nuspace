from typing import List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.common.utils import response_builder
from backend.core.database.models.grade_report import CourseItem, CourseTemplate, StudentCourse, TemplateItem
from backend.modules.courses.courses import schemas as student_course_schemas
from backend.modules.courses.templates import schemas


class TemplateService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def _load_template(self, template_id: int) -> CourseTemplate:
        stmt = (
            select(CourseTemplate)
            .where(CourseTemplate.id == template_id)
            .options(
                selectinload(CourseTemplate.items),
                selectinload(CourseTemplate.student),
            )
            .order_by(CourseTemplate.created_at.desc())
        )
        result = await self.db_session.execute(stmt)
        return result.scalars().one()

    async def add_template(
        self,
        payload: schemas.TemplateCreate,
        user: tuple[dict, dict],
    ) -> schemas.TemplateResponse:
        if payload.student_sub == "me":
            payload.student_sub = user[0].get("sub")
        template_data = schemas._TemplateCreateData(
            course_id=payload.course_id,
            student_sub=payload.student_sub
        )
        template = CourseTemplate(**template_data.model_dump())
        self.db_session.add(template)
        await self.db_session.flush()

        items: List[TemplateItem] = []
        for item in payload.template_items:
            item_data = item.model_dump()
            item_data["template_id"] = template.id
            items.append(TemplateItem(**item_data))
        self.db_session.add_all(items)
        await self.db_session.flush()

        template = await self._load_template(template.id)
        template_responses = await self._build_template_responses([template], user)
        return template_responses[0]

    async def update_template(
        self,
        template: CourseTemplate,
        payload: schemas.TemplateUpdate,
        user: tuple[dict, dict],
    ) -> schemas.TemplateResponse:

        if payload.template_items is not None:
            current_stmt = (
                select(TemplateItem)
                .where(TemplateItem.template_id == template.id)
                .order_by(TemplateItem.created_at.asc())
            )
            current_result = await self.db_session.execute(current_stmt)
            current_items: List[TemplateItem] = list(current_result.scalars().all())
            for item in current_items:
                await self.db_session.delete(item)
            await self.db_session.flush()

            new_items: List[TemplateItem] = []
            for item in payload.template_items:
                item_data = item.model_dump()
                item_data["template_id"] = template.id
                new_items.append(TemplateItem(**item_data))
            self.db_session.add_all(new_items)
            await self.db_session.flush()

            template = await self._load_template(template.id)

        template_responses = await self._build_template_responses([template], user)
        return template_responses[0]

    async def delete_template(self, template: CourseTemplate) -> bool:
        try:
            await self.db_session.delete(template)
            return True
        except Exception:
            return False

    async def import_template_into_student_course(
        self,
        *,
        template: CourseTemplate,
        student_course: StudentCourse,
    ) -> schemas.TemplateImportResponse:
        """Replace student's course items with template items."""
        existing_stmt = select(CourseItem).where(
            CourseItem.student_course_id == student_course.id
        )
        existing_result = await self.db_session.execute(existing_stmt)
        existing_items: List[CourseItem] = list(existing_result.scalars().all())
        for item in existing_items:
            await self.db_session.delete(item)
        if existing_items:
            await self.db_session.flush()

        if not template.items:
            return schemas.TemplateImportResponse(student_course_id=student_course.id, items=[])

        created_items: List[CourseItem] = []
        for item in template.items:
            course_item = CourseItem(
                student_course_id=student_course.id,
                item_name=item.item_name,
                total_weight_pct=float(item.total_weight_pct)
                if item.total_weight_pct is not None
                else None,
                obtained_score=None,
                max_score=None,
            )
            created_items.append(course_item)
        self.db_session.add_all(created_items)
        await self.db_session.flush()
        for item in created_items:
            await self.db_session.refresh(item)

        response_items = [
            student_course_schemas.BaseCourseItem.model_validate(item)
            for item in created_items
        ]

        return schemas.TemplateImportResponse(
            student_course_id=student_course.id,
            items=response_items,
        )

    async def get_template_by_id(
        self, template_id: int, user: tuple[dict, dict]
    ) -> schemas.TemplateResponse | None:
        stmt = (
            select(CourseTemplate)
            .where(CourseTemplate.id == template_id)
            .options(
                selectinload(CourseTemplate.items),
                selectinload(CourseTemplate.student),
            )
            .order_by(CourseTemplate.created_at.desc())
        )
        result = await self.db_session.execute(stmt)
        template: CourseTemplate | None = result.scalars().first()

        if template is None:
            return None

        template_responses = await self._build_template_responses([template], user)
        return template_responses[0] if template_responses else None

    async def get_templates(
        self, user: tuple[dict, dict], course_id: int | None, page: int, size: int
    ) -> schemas.ListTemplateDTO:

        filters = []
        if course_id is not None:
            filters.append(CourseTemplate.course_id == course_id)

        page_num = max(1, page or 1)
        stmt = (
            select(CourseTemplate)
            .where(*filters)
            .options(
                selectinload(CourseTemplate.items),
                selectinload(CourseTemplate.student),
            )
            .order_by(CourseTemplate.created_at.desc())
            .offset((page_num - 1) * size)
            .limit(size)
        )
        result = await self.db_session.execute(stmt)
        templates: List[CourseTemplate] = list(result.scalars().all())

        count_stmt = select(func.count()).select_from(CourseTemplate).where(*filters)
        count_result = await self.db_session.execute(count_stmt)
        count: int = count_result.scalar() or 0
        total_pages: int = response_builder.calculate_pages(count=count, size=size)

        template_responses = await self._build_template_responses(templates, user)

        return schemas.ListTemplateDTO(
            templates=template_responses,
            total_pages=total_pages,
        )

    async def _build_template_responses(
        self,
        templates: List[CourseTemplate],
        user: tuple[dict, dict],
    ) -> List[schemas.TemplateResponse]:
        """Build template responses for both single and multiple templates."""
        if not templates:
            return []

        template_responses: List[schemas.TemplateResponse] = []
        for template in templates:
            template_items_schema: List[schemas.BaseTemplateItem] = [
                schemas.BaseTemplateItem.model_validate(item) for item in template.items
            ]

            template_responses.append(
                schemas.TemplateResponse(
                    template=schemas.BaseCourseTemplate.model_validate(template),
                    template_items=template_items_schema,
                    student=schemas.ShortUserResponse.model_validate(template.student),
                )
            )

        return template_responses
