from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import BinaryExpression
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

from backend.common import cruds as common_cruds
from backend.common.dependencies import check_token, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import response_builder
from backend.core.database.models import Media, Review
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat
from backend.core.database.models.review import ReviewableType
from backend.routes.review import service, utils
from backend.routes.review.schemas import (
    ListReviewResponseSchema,
    ReviewRequestSchema,
    ReviewResponseSchema,
    ReviewUpdateSchema,
)

router = APIRouter(tags=["review"])


@router.get("/reviews", response_model=ListReviewResponseSchema)
async def get(
    request: Request,
    reviewable_type: ReviewableType,
    user: Annotated[dict, Depends(check_token)],
    entity_id: int | None = None,
    owner_id: str | None = None,
    size: int = Query(20, ge=1, le=100),
    page: int = 1,
    db: AsyncSession = Depends(get_db_session),
) -> ListReviewResponseSchema:
    if (entity_id is None and owner_id is None) or (entity_id is not None and owner_id is not None):
        raise HTTPException(status_code=400, detail="You must provide either entity_id or owner_id")

    conditions: List[BinaryExpression] = [Review.reviewable_type == reviewable_type]
    if entity_id is not None:
        conditions.append(Review.entity_id == entity_id)
    else:
        conditions.append(Review.owner_id == owner_id)

    reviews: List[Review] = await common_cruds.get_resources(
        session=db,
        model=Review,
        conditions=conditions,
        preload_relationships=[],
        size=size,
        page=page,
        order_by=[Review.created_at.desc()],
    )

    review_responses: List[ReviewResponseSchema] = await response_builder.build_responses(
        request=request,
        items=reviews,
        session=db,
        media_format=MediaFormat.carousel,
        entity_type=EntityType.reviews,
        response_builder=utils.build_review_response,
    )
    count: int = await common_cruds.get_resource_count(
        model=Review, session=db, conditions=conditions
    )
    num_of_pages: int = response_builder.calculate_pages(count=count, size=size)
    return ListReviewResponseSchema(reviews=review_responses, num_of_pages=num_of_pages)


@router.post("/reviews", response_model=ReviewResponseSchema)
async def add(
    request: Request,
    review: ReviewRequestSchema,
    user: Annotated[dict, Depends(check_token)],
    db: AsyncSession = Depends(get_db_session),
) -> ReviewResponseSchema:
    model: DeclarativeBase = service.REVIEWABLE_TYPE_MODEL_MAP.get(review.reviewable_type)

    obj: DeclarativeBase | None = await common_cruds.get_resource_by_id(
        session=db,
        model=model,
        resource_id=review.entity_id,
    )
    try:
        obj_parent: DeclarativeBase | None = await common_cruds.get_resource_by_id(
            session=db,
            model=service.REVIEWABLE_TYPE_PARENT_MODEL_MAP.get(review.owner_type),
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

    review_obj: Review = await common_cruds.add_resource(
        session=db, model=Review, data=updated_review, preload_relationships=[]
    )

    conditions = [
        Media.entity_id == review_obj.id,
        Media.entity_type == EntityType.reviews,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db, model=Media, conditions=conditions
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_review_response(review=review_obj, media=media_responses)


@router.patch("/reviews", response_model=ReviewResponseSchema)
async def update(
    request: Request,
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

    updated_review: Review = await common_cruds.update_resource(
        session=db, resource=review, update_data=new_data
    )

    conditions = [
        Media.entity_id == updated_review.id,
        Media.entity_type == EntityType.reviews,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await common_cruds.get_resources(
        session=db, model=Media, conditions=conditions
    )

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_review_response(review=updated_review, media=media_responses)


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
