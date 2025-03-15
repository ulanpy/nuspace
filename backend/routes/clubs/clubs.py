from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database.manager import AsyncDatabaseManager
from typing import Optional, Annotated
from backend.routes.auth.auth import *
from .__init__ import *
db = AsyncDatabaseManager()
router = APIRouter(tags=['Club Routes'])


@router.get("/clubs", response_model=list[ClubSchema])
async def login(response: Response, session: AsyncSession = Depends(db.get_async_session),
                limit: int = 10, offset: int = 0, jwt_data: JWTSchema = Depends(get_jwt_data)):
    """
    Club list.
    """
