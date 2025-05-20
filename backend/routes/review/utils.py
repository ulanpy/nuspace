from typing import List

from backend.core.database.models import Club, ClubEvent, Product, User
from backend.core.database.models.review import Review, ReviewableType
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.review.schemas import ReviewResponseSchema

REVIEWABLE_TYPE_MODEL_MAP = {
    ReviewableType.products: Product,
    ReviewableType.events: ClubEvent,
}

REVIEWABLE_PARENT_MODEL_MAP = {
    Product: User,
    ClubEvent: Club,
}


def build_review_response(review: Review, media: List[MediaResponse]) -> ReviewResponseSchema:
    return ReviewResponseSchema(
        id=review.id,
        reviewable_type=review.reviewable_type,
        entity_id=review.entity_id,
        user_sub=review.user_sub,
        rating=review.rating,
        content=review.content,
        owner_type=review.owner_type,
        owner_id=review.owner_id,
        created_at=review.created_at,
        updated_at=review.updated_at,
        media=media,
    )
