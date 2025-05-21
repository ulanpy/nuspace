from typing import Annotated, List, Protocol, Type

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models.club import ClubEvent, ClubManager
from backend.core.database.models.review import Review, ReviewableType, ReviewReply


class ReviewOwnershipChecker(Protocol):
    async def check_ownership(
        self, review: Review, user: Annotated[dict, Depends(check_token)], db: AsyncSession
    ) -> bool: ...


class ProductReviewOwnershipChecker(ReviewOwnershipChecker):
    async def check_ownership(
        self, review: Review, user: Annotated[dict, Depends(check_token)], db: AsyncSession
    ) -> bool:
        if review.owner_id != user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not the owner of this product review",
            )
        return True


class EventReviewOwnershipChecker(ReviewOwnershipChecker):
    async def check_ownership(
        self, review: Review, user: Annotated[dict, Depends(check_token)], db: AsyncSession
    ) -> bool:
        qb = QueryBuilder(session=db, model=ClubEvent)
        club_event: ClubEvent | None = (
            await qb.base().filter(ClubEvent.id == review.entity_id).eager(ClubEvent.club).first()
        )

        qb = QueryBuilder(session=db, model=ClubManager)
        managers: List[ClubManager] = (
            await qb.base().filter(ClubManager.club_id == club_event.club_id).all()
        )

        if not club_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated event not found for review",
            )

        president_sub: str = club_event.club.president

        manager_subs: List[str] = [manager.sub for manager in managers]

        current_user_sub: str = user["sub"]
        is_event_authority: bool = (
            current_user_sub == president_sub or current_user_sub in manager_subs
        )

        if not is_event_authority:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an authority (president or manager) for this event's club",
            )
        return True


OWNERSHIP_CHECKERS: dict[ReviewableType, Type[ReviewOwnershipChecker]] = {
    ReviewableType.products: ProductReviewOwnershipChecker,
    ReviewableType.club_events: EventReviewOwnershipChecker,
}


async def check_resourse_owner(
    review_reply_id: int,
    user: Annotated[dict, Depends(check_token)],
    db: AsyncSession = Depends(get_db_session),
) -> bool:

    qb = QueryBuilder(session=db, model=Review)
    review_obj: ClubEvent | None = await qb.base().filter(Review.id == review_reply_id).first()

    if not review_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    checker_class: Type[ReviewOwnershipChecker] = OWNERSHIP_CHECKERS.get(review_obj.reviewable_type)
    checker: ReviewOwnershipChecker = checker_class()
    return await checker.check_ownership(review_obj, user, db)


async def check_review_reply_owner(
    review_reply_id: int,
    user: Annotated[dict, Depends(check_token)],
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
