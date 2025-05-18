from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError, ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.common import cruds as common_cruds
from backend.common.dependencies import check_token, get_db_session
from backend.core.database.models import Review
from backend.core.database.models.review import ReviewableType
from backend.routes.review.schemas import (
    ReviewRequestSchema,
    ReviewResponseSchema,
    ReviewUpdateSchema,
)
from backend.routes.review.utils import REVIEWABLE_PARENT_MODEL_MAP, REVIEWABLE_TYPE_MODEL_MAP

router = APIRouter(tags=["review"])


@router.get("/reviews", response_model=List[ReviewResponseSchema])
async def get(
    reviewable_type: ReviewableType,
    user: Annotated[dict, Depends(check_token)],
    entity_id: int | None = None,
    owner_id: str | None = None,
    db: AsyncSession = Depends(get_db_session),
) -> List[ReviewResponseSchema]:
    if (entity_id is None and owner_id is None) or (entity_id is not None and owner_id is not None):
        raise HTTPException(status_code=400, detail="You must provide either entity_id or owner_id")

    conditions = [Review.reviewable_type == reviewable_type]
    if entity_id is not None:
        conditions.append(Review.entity_id == entity_id)
    else:
        conditions.append(Review.owner_id == owner_id)

    reviews = await common_cruds.get_resources(
        session=db, model=Review, conditions=conditions, preload_relationships=[]
    )
    reviews_responses = [ReviewResponseSchema.model_validate(review) for review in reviews]
    return reviews_responses


@router.post("/reviews", response_model=ReviewResponseSchema)
async def add(
    review: ReviewRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db: AsyncSession = Depends(get_db_session),
) -> ReviewResponseSchema:
    model: DeclarativeBase = REVIEWABLE_TYPE_MODEL_MAP.get(review.reviewable_type)

    obj: DeclarativeBase | None = await common_cruds.get_resource_by_id(
        session=db,
        model=model,
        resource_id=review.entity_id,
    )
    try:
        obj_parent: DeclarativeBase | None = await common_cruds.get_resource_by_id(
            session=db,
            model=REVIEWABLE_PARENT_MODEL_MAP.get(model),
            resource_id=review.owner_id,
        )
    except ProgrammingError:
        raise HTTPException(status_code=404, detail="Owner id is not valid")

    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    if not obj_parent:
        raise HTTPException(status_code=404, detail="Owner id is not valid")

    updated_review: ReviewRequestSchema = review.model_copy(
        update={"owner_id": str(review.owner_id)}
    )

    try:
        review_obj: Review = await common_cruds.add_resource(
            session=db, model=Review, data=updated_review, preload_relationships=[]
        )
    except IntegrityError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return ReviewResponseSchema.model_validate(review_obj)


@router.patch("/reviews", response_model=ReviewResponseSchema)
async def update(
    review_id: int,
    new_data: ReviewUpdateSchema,
    user: Annotated[dict, Depends(check_token)],
    db: AsyncSession = Depends(get_db_session),
) -> ReviewResponseSchema:
    review_conditions: List = [Review.user_sub == user.get("sub")]

    review: Review | None = await common_cruds.get_resource_by_id(
        session=db,
        model=Review,
        resource_id=review_id,
        conditions=review_conditions,
        preload_relationships=[],
    )

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found or doesn't belong to you")

    updated_review: Review | None = await common_cruds.update_resource(
        session=db, resource=review, update_data=new_data
    )
    return ReviewResponseSchema.model_validate(updated_review)


@router.delete("/reviews", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    review_id: int,
    user: Annotated[dict, Depends(check_token)],
    db: AsyncSession = Depends(get_db_session),
):
    review_conditions: List = [Review.user_sub == user.get("sub")]

    review: Review | None = await common_cruds.get_resource_by_id(
        session=db,
        model=Review,
        resource_id=review_id,
        conditions=review_conditions,
        preload_relationships=[],
    )

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found or doesn't belong to you")

    await common_cruds.delete_resource(session=db, resource=review)
