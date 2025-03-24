from fastapi import APIRouter, Depends
from .__init__ import *
from backend.common.utils import import_data_from_database
from backend.common.dependencies import get_db_session

router = APIRouter(tags = ['Kupi-Prodai Routes'])

@router.get("/import")
async def import_from_database(request: Request, db_session: AsyncSession = Depends(get_db_session)):
    return await import_data_from_database(storage_name='', session = db_session, model_name="User", columns_for_searching=["id", "email"])

    