from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database.manager import AsyncDatabaseManager
from backend.common.dependencies import get_db_session
from typing import Optional, Annotated
from backend.routes.auth.auth import *
from .schemas import ClubEventSchema
from .__init__ import *
db = AsyncDatabaseManager()
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
async def search(keyword: str, db_session: Depends(get_db_session)):
    pass
