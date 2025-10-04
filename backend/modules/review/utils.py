from typing import List

from backend.common.schemas import MediaResponse
from backend.core.database.models.review import Review
from backend.modules.review.schemas import ReviewResponseSchema


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
        reply=review.reply,
    )
