from fastapi import APIRouter, Request, HTTPException, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.database.manager import AsyncDatabaseManager
from typing import Optional, Annotated
from backend.routes.auth.auth import *
from .__init__ import *
db = AsyncDatabaseManager()
router = APIRouter(tags=['Club Routes'])


