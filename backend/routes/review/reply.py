from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common import cruds as common_cruds
from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.review import ReviewReply
from backend.routes.review.dependencies import (
    check_resourse_owner,
    check_review_reply_owner,
)
from backend.routes.review.schemas import ReviewReplyRequestSchema, ReviewReplyResponseSchema

router = APIRouter(tags=["review_reply"])


@router.post("/review/reply")
async def add_review_reply(
    review_reply: ReviewReplyRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    owner: Annotated[bool, Depends(check_resourse_owner)],
    db: AsyncSession = Depends(get_db_session),
):
    try:
        reply: ReviewReply = await common_cruds.add_resource(
            session=db, model=ReviewReply, data=review_reply, preload_relationships=[]
        )
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You already answered this review"
        )

    return ReviewReplyResponseSchema.model_validate(reply)


@router.delete("/review/reply", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_reply(
    review_reply_id: int,
    user: Annotated[dict, Depends(check_token)],
    owner: Annotated[bool, Depends(check_review_reply_owner)],
    db: AsyncSession = Depends(get_db_session),
):
    review_reply: ReviewReply | None = await common_cruds.get_resource_by_id(
        session=db, model=ReviewReply, resource_id=review_reply_id
    )

    await common_cruds.delete_resource(session=db, resource=review_reply)
