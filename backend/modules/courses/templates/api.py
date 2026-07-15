from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.modules.auth.dependencies import get_creds_or_401
from backend.modules.courses.templates import schemas
from backend.modules.courses.templates.dependencies import get_template_service
from backend.modules.courses.templates.service import TemplateService


router = APIRouter(tags=["Course Templates"])


@router.post("/templates", response_model=schemas.TemplateResponse)
async def create_template(
    payload: schemas.TemplateCreate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Create a new template for a course.
    Throws 409 error if template already exists for the course and user.
    """
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
    return await template_service.get_templates(user, course_id, page, size)


@router.get("/templates/{template_id}", response_model=schemas.TemplateResponse)
async def get_template(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateResponse:
    """
    Get a single template by id (must belong to current user).
    """
    return await template_service.get_template_by_id(template_id, user)


@router.patch("/templates/{template_id}", response_model=schemas.TemplateResponse)
async def update_template(
    template_id: int,
    payload: schemas.TemplateUpdate,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateResponse:
    """
    Update an existing template.
    """
    return await template_service.update_template(template_id, payload, user)


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: int,
    user: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    template_service: TemplateService = Depends(get_template_service),
):
    """
    Delete a template.
    """
    await template_service.delete_template(template_id, user)
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
    template_service: TemplateService = Depends(get_template_service),
) -> schemas.TemplateImportResponse:
    """Import template into a student's registered course."""
    return await template_service.import_template_into_student_course(
        template_id=template_id,
        student_course_id=student_course_id,
        user=user,
    )
