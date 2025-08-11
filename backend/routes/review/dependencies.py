from typing import Annotated, Protocol, Type

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import get_current_principals, get_db_session
from backend.core.database.models import Event
from backend.core.database.models.review import Review, ReviewableType, ReviewReply
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession


class ReviewOwnershipChecker(Protocol):
    async def check_ownership(
        self,
        review: Review,
        user: Annotated[dict, Depends(get_current_principals)],
        db: AsyncSession,
    ) -> bool: ...


class ProductReviewOwnershipChecker(ReviewOwnershipChecker):
    async def check_ownership(
        self,
        review: Review,
        user: Annotated[dict, Depends(get_current_principals)],
        db: AsyncSession,
    ) -> bool:
        if review.owner_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not the owner of this product review",
            )
        return True


class EventReviewOwnershipChecker(ReviewOwnershipChecker):
    async def check_ownership(
        self,
        review: Review,
        user: Annotated[dict, Depends(get_current_principals)],
        db: AsyncSession,
    ) -> bool:
        qb = QueryBuilder(session=db, model=Event)
        club_event: Event | None = (
            await qb.base().filter(Event.id == review.entity_id).eager(Event.community).first()
        )

        if not club_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated event not found for review",
            )

        head_sub: str = club_event.community.head

        current_user_sub: str = user["sub"]
        is_event_authority: bool = current_user_sub == head_sub

        if not is_event_authority:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an authority (head) for this event's community",
            )
        return True


OWNERSHIP_CHECKERS: dict[ReviewableType, Type[ReviewOwnershipChecker]] = {
    ReviewableType.products: ProductReviewOwnershipChecker,
    ReviewableType.club_events: EventReviewOwnershipChecker,
}


async def check_resourse_owner(
    review_reply_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    db: AsyncSession = Depends(get_db_session),
) -> bool:

    qb = QueryBuilder(session=db, model=Review)
    review_obj: Review | None = await qb.base().filter(Review.id == review_reply_id).first()

    if not review_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    checker_class: Type[ReviewOwnershipChecker] = OWNERSHIP_CHECKERS.get(review_obj.reviewable_type)
    checker: ReviewOwnershipChecker = checker_class()
    return await checker.check_ownership(review_obj, user, db)


async def check_review_reply_owner(
    review_reply_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    db: AsyncSession = Depends(get_db_session),
) -> bool:

    qb = QueryBuilder(session=db, model=ReviewReply)
    review_reply: ReviewReply | None = (
        await qb.base().filter(ReviewReply.id == review_reply_id).first()
    )

    if review_reply.user_sub != user["sub"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not the owner of this review reply",
        )
    return True
