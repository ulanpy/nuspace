from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.dependencies import get_db_session
from typing import Optional, Annotated, List

from .cruds import add_new_club
from .schemas import ClubEventSchema, ClubRequestSchema

router = APIRouter(tags=['Club Routes'])


@router.get("/api/events/list", response_model=List[ClubEventSchema])
async def get_all_events(db_sesssion: AsyncSession = Depends(get_db_session)):
    pass


@router.get("/api/events/{event_id}", response_model=ClubEventSchema)
async def get_event(event_id: int, db_sesssion: AsyncSession = Depends(get_db_session)):
    pass


@router.get("/api/clubs/{club_id}/events", response_model=ClubEventSchema)
async def get_club_events(club_id: int, db_sesssion: AsyncSession = Depends(get_db_session)):
    pass


@router.get("/api/events/search", response_model=ClubEventSchema)
async def search(keyword: str, db_sesssion: AsyncSession = Depends(get_db_session)):
    pass


@router.get("/api/clubs/add", response_model=ClubEventSchema)
async def add(request: Request, club: ClubRequestSchema, db_session: AsyncSession = Depends(get_db_session)):
    return await add_new_club(request, club, db_session)

