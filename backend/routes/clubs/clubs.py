from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from typing import Optional, Annotated, List

from .cruds import add_new_club
from .schemas import ClubRequestSchema, ClubResponseSchema

router = APIRouter(tags=['Club Routes'])


@router.post("/clubs/add")
async def add_club(
    request: Request,
    club: ClubRequestSchema,
    db_session: AsyncSession = Depends(get_db_session)
) -> ClubResponseSchema:
    try:
        return await add_new_club(request, club, db_session)
    except IntegrityError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="db rejected the request: probably there are unique issues")


@router.post("/events/add")
async def add_event():
    pass


