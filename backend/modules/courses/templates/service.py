from typing import List

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.utils import response_builder
from backend.core.database.models.grade_report import CourseItem, CourseTemplate, StudentCourse, TemplateItem
from backend.modules.courses.student_courses import schemas as student_course_schemas
from backend.modules.courses.templates import schemas


class TemplateService:
    def __init__(self, db_session: AsyncSession):
        self.db_session = db_session

    async def add_template(
        self,
        payload: schemas.TemplateCreate,
        user: tuple[dict, dict],
    ) -> schemas.TemplateResponse:
        if payload.student_sub == "me":
            payload.student_sub = user[0].get("sub")
        # === Create new template ===
        qb = QueryBuilder(session=self.db_session, model=CourseTemplate)
        # Create template data without template_items for the CourseTemplate model
        template_data = schemas._TemplateCreateData(
            course_id=payload.course_id,
            student_sub=payload.student_sub
        )
        template: CourseTemplate = await qb.add(data=template_data)

        # === Insert template items ===
        items_with_template_id: List[schemas._TemplateItemCreateData] = []
        for item in payload.template_items:
            item_data = item.model_dump()
            item_data["template_id"] = template.id
            item_data["course_item_id"] = payload.course_id  # TODO: This should be a proper course_item_id
            items_with_template_id.append(schemas._TemplateItemCreateData(**item_data))
        
        await qb.blank(model=TemplateItem).add(data=items_with_template_id)
        template: CourseTemplate = (await qb
        .blank(model=CourseTemplate)
        .base()
        .filter(CourseTemplate.id == template.id)
        .eager(CourseTemplate.items, CourseTemplate.student)
        .order(CourseTemplate.created_at.desc())
        .first()
        )
        template_responses = await self._build_template_responses([template], user)
        return template_responses[0]

    async def update_template(
        self,
        template: CourseTemplate,
        payload: schemas.TemplateUpdate,
        user: tuple[dict, dict],
    ) -> schemas.TemplateResponse:

        # Clear existing items if new ones provided
        if payload.template_items is not None:
            qb = QueryBuilder(session=self.db_session, model=TemplateItem)
            current_items: List[TemplateItem] = (
                await qb
                .base()
                .filter(TemplateItem.template_id == template.id)
                .order(TemplateItem.created_at.asc())
                .all()
            )
            await qb.delete(target=current_items)

            # Insert new items
            created_items: List[schemas._TemplateItemCreateData] = []
            for item in payload.template_items:
                item_data = item.model_dump()
                item_data["template_id"] = template.id
                item_data["course_item_id"] = template.course_id  # Use course_id from existing template
                created_items.append(schemas._TemplateItemCreateData(**item_data))

            await qb.blank(model=TemplateItem).add(data=created_items)
            
            template: CourseTemplate = (await qb
                .blank(model=CourseTemplate)
                .base()
                .filter(CourseTemplate.id == template.id)
                .eager(CourseTemplate.items, CourseTemplate.student)
                .order(CourseTemplate.created_at.desc())
                .first()
                )

        template_responses = await self._build_template_responses([template], user)
        return template_responses[0]

    async def delete_template(self, template: CourseTemplate) -> bool:
        tmpl_qb = QueryBuilder(session=self.db_session, model=CourseTemplate)
        deleted = await tmpl_qb.delete(target=template)
        if not deleted:
            return False
        return True

    async def import_template_into_student_course(
        self,
        *,
        template: CourseTemplate,
        student_course: StudentCourse,
    ) -> schemas.TemplateImportResponse:
        """Replace student's course items with template items."""
        # remove existing course items
        course_item_qb = QueryBuilder(session=self.db_session, model=CourseItem)
        existing_items: List[CourseItem] = (
            await course_item_qb
            .base()
            .filter(CourseItem.student_course_id == student_course.id)
            .all()
        )
        if existing_items:
            await course_item_qb.delete(target=existing_items)

        if not template.items:
            return schemas.TemplateImportResponse(student_course_id=student_course.id, items=[])

        # build new course items based on template
        new_items_data: List[student_course_schemas.CourseItemCreate] = []
        for item in template.items:
            new_items_data.append(
                student_course_schemas.CourseItemCreate(
                    student_course_id=student_course.id,
                    item_name=item.item_name,
                    total_weight_pct=float(item.total_weight_pct)
                    if item.total_weight_pct is not None
                    else None,
                    obtained_score_pct=0.0,
                )
            )

        created_items: List[CourseItem] = await course_item_qb.add(data=new_items_data)

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
        qb = QueryBuilder(session=self.db_session, model=CourseTemplate)

        template: CourseTemplate | None = (
            await qb
            .base()
            .filter(CourseTemplate.id == template_id)
            .eager(CourseTemplate.items, CourseTemplate.student)
            .order(CourseTemplate.created_at.desc())
            .first()
        )

        if template is None:
            return None

        template_responses = await self._build_template_responses([template], user)
        return template_responses[0] if template_responses else None

    async def get_templates(
        self, user: tuple[dict, dict], course_id: int | None, page: int, size: int
    ) -> schemas.ListTemplateDTO:
        student_sub = user[0].get("sub")

        filters = [CourseTemplate.student_sub == student_sub]
        if course_id is not None:
            filters.append(CourseTemplate.course_id == course_id)

        qb = QueryBuilder(session=self.db_session, model=CourseTemplate)
        templates: List[CourseTemplate] = (
            await qb.base()
            .filter(*filters)
            .paginate(size, page)
            .eager(CourseTemplate.items, CourseTemplate.student)
            .order(CourseTemplate.created_at.desc())
            .all()
        )

        count: int = await qb.blank(model=CourseTemplate).base(count=True).filter(*filters).count()
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
            # Items are already eagerly loaded via QueryBuilder.eager(CourseTemplate.items)
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