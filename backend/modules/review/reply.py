from typing import Annotated, List

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, get_creds_or_401, get_db_session
from backend.core.database.models.review import ReviewReply
from backend.core.database.models.user import UserRole
from backend.modules.review.dependencies import (
    check_resourse_owner,
    check_review_reply_owner,
)
from backend.modules.review.schemas import ReviewReplyRequestSchema, ReviewReplyResponseSchema
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["review_reply"])


@router.post("/review/reply")
async def add_review_reply(
    review_reply: ReviewReplyRequestSchema,
    user: Annotated[dict, Depends(get_creds_or_401)],
    owner: Annotated[bool, Depends(check_resourse_owner)],
    db: AsyncSession = Depends(get_db_session),
):
    try:
        qb = QueryBuilder(session=db, model=ReviewReply)
        reply: ReviewReply = await qb.add(data=review_reply)

    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You already answered this review"
        )

    return ReviewReplyResponseSchema.model_validate(reply)


@router.delete("/review/reply", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review_reply(
    review_reply_id: int,
    user: Annotated[dict, Depends(get_creds_or_401)],
    role: Annotated[UserRole, Depends(check_role)],
    owner: Annotated[bool, Depends(check_review_reply_owner)],
    db: AsyncSession = Depends(get_db_session),
):
    conditions = []
    if role != UserRole.admin:
        conditions: List = [ReviewReply.user_sub == user.get("sub")]

    qb = QueryBuilder(session=db, model=ReviewReply)
    review_reply: ReviewReply | None = (
        await qb.base().filter(ReviewReply.id == review_reply_id, *conditions).first()
    )

    if not review_reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review reply not found or doesn't belong to you",
        )

    qb = QueryBuilder(session=db, model=ReviewReply)
    reply_deleted: bool = await qb.delete(target=review_reply)

    if not reply_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review reply not found")
