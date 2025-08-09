from typing import Annotated, List

from backend.common.cruds import QueryBuilder
from backend.common.dependencies import check_role, get_current_principals, get_db_session
from backend.common.schemas import MediaResponse
from backend.common.utils import response_builder
from backend.core.database.models import Media, Review
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.media import MediaFormat
from backend.core.database.models.review import ReviewableType
from backend.core.database.models.user import UserRole
from backend.routes.google_bucket.utils import delete_bucket_object
from backend.routes.review import service, utils
from backend.routes.review.schemas import (
    ListReviewResponseSchema,
    ReviewRequestSchema,
    ReviewResponseSchema,
    ReviewUpdateSchema,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import BinaryExpression
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

router = APIRouter(tags=["review"])


@router.get("/reviews", response_model=ListReviewResponseSchema)
async def get(
    request: Request,
    reviewable_type: ReviewableType,
    user: Annotated[dict, Depends(get_current_principals)],
    entity_id: int | None = None,
    owner_id: str | int | None = None,
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

    qb = QueryBuilder(session=db, model=Review)
    reviews: List[Review] = (
        await qb.base()
        .filter(*conditions)
        .eager(Review.reply)
        .paginate(size, page)
        .order(Review.created_at.desc())
        .all()
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id.in_([review.id for review in reviews]),
            Media.entity_type == EntityType.reviews,
            Media.media_format == MediaFormat.carousel,  # Assuming carousel for reviews
        )
        .all()
    )

    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=reviews
    )

    review_responses: List[ReviewResponseSchema] = [
        response_builder.build_schema(
            ReviewResponseSchema,
            ReviewResponseSchema.model_validate(review),
            media=media,
        )
        for review, media in zip(reviews, media_results)
    ]

    count: int = await qb.blank(model=Review).base(count=True).filter(*conditions).count()

    total_pages: int = response_builder.calculate_pages(count=count, size=size)

    return ListReviewResponseSchema(reviews=review_responses, total_pages=total_pages)


@router.post("/reviews", response_model=ReviewResponseSchema)
async def add(
    request: Request,
    review: ReviewRequestSchema,
    user: Annotated[dict, Depends(get_current_principals)],
    db: AsyncSession = Depends(get_db_session),
) -> ReviewResponseSchema:
    model: DeclarativeBase = service.REVIEWABLE_TYPE_MODEL_MAP.get(review.reviewable_type)
    parent_model: DeclarativeBase = service.REVIEWABLE_TYPE_PARENT_MODEL_MAP.get(review.owner_type)

    qb: QueryBuilder = QueryBuilder(session=db, model=model)
    obj: DeclarativeBase | None = await qb.base().filter(model.id == review.entity_id).first()

    try:
        # Get the primary key field name for the parent model
        pk_field_name = service.MODEL_PRIMARY_KEY_MAP.get(parent_model)
        if not pk_field_name:
            raise HTTPException(status_code=400, detail="Unsupported owner type")

        # Use getattr to dynamically access the primary key field
        pk_field = getattr(parent_model, pk_field_name)
        obj_parent: DeclarativeBase | None = (
            await qb.blank(model=parent_model).base().filter(pk_field == review.owner_id).first()
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

    review_obj: Review | None = await qb.blank(model=Review).add(
        data=updated_review, preload=[Review.reply]
    )

    media_objs: List[Media] = (
        await qb.blank(model=Media)
        .base()
        .filter(
            Media.entity_id == review_obj.id,
            Media.entity_type == EntityType.reviews,
            Media.media_format
            == MediaFormat.carousel,  # Assuming carousel for posts, adjust if needed
        )
        .all()
    )
    media_results: List[List[MediaResponse]] = await response_builder.map_media_to_resources(
        request=request, media_objects=media_objs, resources=[review_obj]
    )  # one to one mapping

    return response_builder.build_schema(
        ReviewResponseSchema,
        ReviewResponseSchema.model_validate(review_obj),
        media=media_results[0],
    )


@router.patch("/reviews", response_model=ReviewResponseSchema)
async def update(
    request: Request,
    review_id: int,
    new_data: ReviewUpdateSchema,
    user: Annotated[dict, Depends(get_current_principals)],
    role: Annotated[UserRole, Depends(check_role)],
    db: AsyncSession = Depends(get_db_session),
) -> ReviewResponseSchema:

    review_conditions = []
    if role != UserRole.admin:
        review_conditions.append(Review.user_sub == user.get("sub"))

    qb = QueryBuilder(session=db, model=Review)
    review: Review | None = (
        await qb.base()
        .filter(Review.id == review_id, *review_conditions)
        .eager(Review.reply)
        .first()
    )

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found or doesn't belong to you")

    updated_review: Review = await qb.blank().update(instance=review, update_data=new_data)

    conditions = [
        Media.entity_id == updated_review.id,
        Media.entity_type == EntityType.reviews,
        Media.media_format == MediaFormat.carousel,
    ]

    media_objects: List[Media] = await qb.blank(model=Media).base().filter(*conditions).all()

    media_responses: List[MediaResponse] = await response_builder.build_media_responses(
        request=request, media_objects=media_objects
    )

    return utils.build_review_response(review=updated_review, media=media_responses)


@router.delete("/reviews", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    request: Request,
    review_id: int,
    user: Annotated[dict, Depends(get_current_principals)],
    role: Annotated[UserRole, Depends(check_role)],
    db: AsyncSession = Depends(get_db_session),
):
    review_conditions = []
    if role != UserRole.admin:
        review_conditions: List = [Review.user_sub == user.get("sub")]

    qb = QueryBuilder(session=db, model=Review)
    review: Review | None = (
        await qb.base().filter(Review.id == review_id, *review_conditions).first()
    )

    if review is None:
        raise HTTPException(status_code=404, detail="Review not found or doesn't belong to you")

    # Get and delete associated media files
    media_conditions = [
        Media.entity_id == review.id,
        Media.entity_type == EntityType.reviews,
    ]

    media_objects: List[Media] = await qb.blank(model=Media).base().filter(*media_conditions).all()

    # Delete media files from storage bucket
    if media_objects:
        for media in media_objects:
            await delete_bucket_object(request, media.name)

    review_deleted: bool = await qb.blank(model=Review).delete(target=review)

    # Delete associated media records from database
    media_deleted: bool = await qb.blank(model=Media).delete(target=media_objects)

    if not review_deleted or not media_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
