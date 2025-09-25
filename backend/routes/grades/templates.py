from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.database.models.grade_report import CourseTemplate, TemplateItem as TemplateItemORM, CourseItem
from backend.routes.grades import schemas
from backend.routes.grades.template_policy import TemplatePolicy


router = APIRouter(tags=["Grades Templates"])

@router.post("/templates", response_model=schemas.TemplateResponse)
async def upsert_template(
    payload: schemas.TemplateCreate,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
):
    """
    Create or replace the current user's template for a course.
    If a template exists for (course_id, student_sub), its items are replaced.
    """
    # Policy check
    policy = TemplatePolicy(user=user, db_session=db_session)
    policy.check_create(payload)
    
    student_sub = user[0].get("sub")

    # Ensure one template per (course_id, student_sub)
    tmpl_qb = QueryBuilder(session=db_session, model=CourseTemplate)
    existing: CourseTemplate | None = (
        await tmpl_qb.base()
        .filter(
            CourseTemplate.course_id == payload.course_id,
            CourseTemplate.student_sub == student_sub,
        )
        .first()
    )

if existing is None:
    existing = await tmpl_qb.add(
        data=payload
    )

    else:
        # Clear existing items
        item_qb = QueryBuilder(session=db_session, model=TemplateItemORM)
        current_items: List[TemplateItemORM] = (
            await item_qb.base().filter(TemplateItemORM.template_id == existing.id).all()
        )
        for ci in current_items:
            await item_qb.delete(target=ci)

    # Insert new items
# Insert new items using full Pydantic model
    item_qb = QueryBuilder(session=db_session, model=TemplateItemORM)
    created_items: List[TemplateItemORM] = []
    for it in payload.template_items:
        item_data = it.model_dump()
        item_data["template_id"] = existing.id
        new_item = await item_qb.add(data=item_data)
        created_items.append(new_item)


    return schemas.TemplateResponse(
        template=schemas.BaseCourseTemplate.model_validate(existing),
        template_items=await _serialize_items(created_items, db_session),
    )


@router.get("/templates", response_model=schemas.ListTemplateDTO)
async def list_templates(
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
    course_id: int | None = Query(default=None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> schemas.ListTemplateDTO:
    """
    List the current user's templates. Optional filter by course_id.
    """
    # Policy check
    policy = TemplatePolicy(user=user, db_session=db_session)
    await policy.check_read_list(course_id)
    
    student_sub = user[0].get("sub")

    filters = [CourseTemplate.student_sub == student_sub]
    if course_id is not None:
        filters.append(CourseTemplate.course_id == course_id)

        tmpl_qb = QueryBuilder(session=db_session, model=CourseTemplate)
        templates: List[CourseTemplate] = (
            await tmpl_qb.base().filter(*filters).paginate(size, page).order(CourseTemplate.created_at.desc()).all()
        )

        count: int = await tmpl_qb.blank(model=CourseTemplate).base(count=True).filter(*filters).count()
        total_pages = (count + size - 1) // size

        # Fetch items for all templates in one go
        tmpl_ids = [t.id for t in templates]
        items_map: dict[int, List[TemplateItemORM]] = {tid: [] for tid in tmpl_ids}
        if tmpl_ids:
            item_qb = QueryBuilder(session=db_session, model=TemplateItemORM)
            all_items: List[TemplateItemORM] = (
                await item_qb.base().filter(TemplateItemORM.template_id.in_(tmpl_ids)).all()
            )
            for it in all_items:
                items_map[it.template_id].append(it)

    return schemas.ListTemplateDTO(
        templates=[
            schemas.TemplateResponse(
                template=schemas.BaseCourseTemplate.model_validate(t),
                template_items=await _serialize_items(items_map.get(t.id, []), db_session),
            )
            for t in templates
        ],
        total_pages=total_pages,
    )


@router.get("/templates/{template_id}", response_model=schemas.TemplateResponse)
async def get_template(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_current_principals)],
    db_session: AsyncSession = Depends(get_db_session),
) -> schemas.TemplateResponse:
    """
    Get a single template by id (must belong to current user).
    """
    # Policy check
    policy = TemplatePolicy(user=user, db_session=db_session)
    
    student_sub = user[0].get("sub")
    tmpl_qb = QueryBuilder(session=db_session, model=CourseTemplate)
    template: CourseTemplate | None = (
        await tmpl_qb.base()
        .filter(CourseTemplate.id == template_id, CourseTemplate.student_sub == student_sub)
        .first()
    )
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    
    # Additional policy check for the specific template
    await policy.check_read_one(template)

        item_qb = QueryBuilder(session=db_session, model=TemplateItemORM)
        items: List[TemplateItemORM] = (
            await item_qb.base().filter(TemplateItemORM.template_id == template.id).all()
        )

    return schemas.TemplateResponse(
        template=schemas.BaseCourseTemplate.model_validate(template),
        template_items=await _serialize_items(items, db_session),
    )


async def _serialize_items(items: List[TemplateItemORM], db_session: AsyncSession) -> list[schemas.TemplateItem]:
    if not items:
        return []
    # Load related CourseItems in one go
    course_item_ids = [i.course_item_id for i in items]
    qb = QueryBuilder(session=db_session, model=CourseItem)
    course_items: list[CourseItem] = (
        await qb.base().filter(CourseItem.id.in_(course_item_ids)).all()
    )
    by_id: dict[int, CourseItem] = {ci.id: ci for ci in course_items}
    return [
        schemas.TemplateItem(
            item_name=by_id.get(it.course_item_id).item_name if by_id.get(it.course_item_id) else "",
            total_weight_pct=by_id.get(it.course_item_id).total_weight_pct if by_id.get(it.course_item_id) else None,
        )
        for it in items
    ]


