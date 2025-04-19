from fastapi import APIRouter

from backend.core.database.manager import AsyncDatabaseManager
from backend.routes.auth.auth import *

from .__init__ import *

db = AsyncDatabaseManager()
router = APIRouter(tags=["Club Routes"])
