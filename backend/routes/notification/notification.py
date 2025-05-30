from typing import Annotated, List

from fastapi import APIRouter, Depends, Request

from backend.common.dependencies import check_token
from backend.routes.notification import schemas

router = APIRouter(tags=["Notifications"])


@router.get("/notification", response_model=List[schemas.BaseNotification])
async def get(
    request: Request, user: Annotated[dict, Depends(check_token)]
) -> List[schemas.BaseNotification]:
    pass


@router.post("/notification", response_model=schemas.BaseNotification)
async def send(
    request: Request,
    user: Annotated[dict, Depends(check_token)],
    notification_data: schemas.RequestNotiification,
) -> schemas.BaseNotification:
    pass
