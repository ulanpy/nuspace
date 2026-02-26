from typing import Annotated, List

from backend.common.dependencies import get_creds_or_401
from backend.modules.sgotinish.delegation import dependencies as deps
from backend.modules.sgotinish.delegation import schemas
from backend.modules.sgotinish.delegation.service import DelegationService
from fastapi import APIRouter, Depends, Query, status

router = APIRouter(tags=["SGotinish Delegation Routes"])


@router.get("/sg-delegation/departments", response_model=List[schemas.DepartmentResponseDTO])
async def get_departments(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.get_departments_authorized(user_tuple)


@router.post("/sg-delegation/departments", response_model=schemas.DepartmentResponseDTO)
async def create_department(
    payload: schemas.DepartmentCreatePayload,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.create_department_authorized(
        user=user_tuple,
        payload=payload,
    )


@router.delete(
    "/sg-delegation/departments/{department_id}",
    response_model=schemas.SGMemberActionResult,
)
async def delete_department(
    department_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.delete_department_authorized(
        user=user_tuple,
        department_id=department_id,
    )


@router.get("/sg-delegation/users", response_model=List[schemas.SGUserResponse])
async def get_sg_users(
    department_id: int,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.get_sg_users_authorized(department_id, user_tuple)


@router.get("/sg-members/users", response_model=List[schemas.SGMemberSearchResponseDTO])
async def search_users_for_sg_management(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
    q: str | None = Query(default=None, description="Search in name, surname, email"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of users to return"),
):
    return await delegation_service.search_users_for_sg(user=user_tuple, q=q, limit=limit)


@router.get("/sg-members", response_model=List[schemas.SGMemberResponseDTO])
async def list_sg_members(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.list_sg_members(user=user_tuple)


@router.post("/sg-members", response_model=schemas.SGMemberResponseDTO)
async def upsert_sg_member(
    payload: schemas.SGMemberUpsertPayload,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.upsert_sg_member(user=user_tuple, payload=payload)


@router.delete("/sg-members/{target_user_sub}", response_model=schemas.SGMemberActionResult)
async def remove_sg_member(
    target_user_sub: str,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.remove_sg_member(user=user_tuple, target_user_sub=target_user_sub)


@router.post("/sg-members/withdraw", response_model=schemas.SGMemberActionResult)
async def withdraw_from_sg(
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    return await delegation_service.withdraw_from_sg(user=user_tuple)


@router.post("/tickets/{ticket_id}/delegate", status_code=status.HTTP_204_NO_CONTENT)
async def delegate_ticket_access(
    ticket_id: int,
    payload: schemas.DelegateAccessPayload,
    user_tuple: Annotated[tuple[dict, dict], Depends(get_creds_or_401)],
    delegation_service: DelegationService = Depends(deps.get_delegation_service),
):
    await delegation_service.delegate_ticket_access_by_id(
        ticket_id=ticket_id,
        user_tuple=user_tuple,
        payload=payload,
    )
