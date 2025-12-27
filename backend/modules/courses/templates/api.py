from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.common.dependencies import get_creds_or_401
from backend.core.database.models.grade_report import CourseTemplate, StudentCourse
from backend.modules.courses.templates import schemas
from backend.modules.courses.templates.policy import TemplatePolicy
from backend.modules.courses.templates.service import TemplateService
from backend.modules.courses.templates.dependencies import (
    get_template_service,
    student_course_exists_or_404,
    template_exists_or_404,
    template_not_exists_or_409,
)


router = APIRouter(tags=["Course Templates"])


@router.post("/templates", response_model=schemas.TemplateResponse)
async def create_template(
    payload: schemas.TemplateCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template_service: TemplateService = Depends(get_template_service),
    _: None = Depends(template_not_exists_or_409),
):
    """
    Create a new template for a course.
    Throws 409 error if template already exists for the course and user.
    """
    # Policy check
    TemplatePolicy(user=user).check_create(payload)
    
    return await template_service.add_template(payload, user)


@router.get("/templates", response_model=schemas.ListTemplateDTO)
async def list_templates(
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    course_id: int | None = Query(default=None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.ListTemplateDTO:
    """
    List the current user's templates. Optional filter by course_id.
    """
    # Policy check
    TemplatePolicy(user=user).check_read_list(course_id)
    
    return await template_service.get_templates(user, course_id, page, size)


@router.get("/templates/{template_id}", response_model=schemas.TemplateResponse)
async def get_template(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template: CourseTemplate = Depends(template_exists_or_404),
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateResponse:
    """
    Get a single template by id (must belong to current user).
    """
    # Policy check
    TemplatePolicy(user=user).check_read_one(template)
    
    return await template_service.get_template_by_id(template_id, user)


@router.patch("/templates/{template_id}", response_model=schemas.TemplateResponse)
async def update_template(
    template_id: int,
    payload: schemas.TemplateUpdate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template: CourseTemplate = Depends(template_exists_or_404),
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateResponse:
    """
    Update an existing template.
    """
    # Policy check
    TemplatePolicy(user=user).check_update(template, payload)
    
    return await template_service.update_template(template, payload, user)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template: CourseTemplate = Depends(template_exists_or_404),
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Delete a template.
    """
    # Policy check
    TemplatePolicy(user=user).check_delete(template)
    
    deleted = await template_service.delete_template(template)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    
    return status.HTTP_204_NO_CONTENT


@router.post(
    "/templates/{template_id}/import",
    response_model=schemas.TemplateImportResponse,
    status_code=status.HTTP_200_OK,
)
async def import_template_into_course(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    student_course_id: int = Query(..., ge=1),
    template: CourseTemplate = Depends(template_exists_or_404),
    student_course: StudentCourse = Depends(student_course_exists_or_404),
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateImportResponse:
    """Import template into a student's registered course."""
    TemplatePolicy(user=user).check_import(template, student_course)

    return await template_service.import_template_into_student_course(
        template=template,
        student_course=student_course,
    )



