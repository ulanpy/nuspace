from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Union
from backend.core.database import *
from backend.routes.auth.schemas import *
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete, insert, update, text, Interval, cast
from typing import AsyncGenerator
import os
from backend.core.configs.config import *
from .schemas import ClubRequestSchema, ClubEventSchema, ClubResponseSchema


async def add_new_club(club_data: ClubRequestSchema, session: AsyncSession) -> ClubResponseSchema:
    pass

async def add_new_event(event_data: ClubEventSchema, session: AsyncSession) -> ClubEventSchema:
    pass

async def get_events() -> list[ClubEventSchema]:
    pass

async def get_event(even_id: int, event_data: ClubEventSchema, session: AsyncSession) -> ClubEventSchema:
    pass

