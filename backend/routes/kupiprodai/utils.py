import asyncio
from typing import List

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models.media import Media
from backend.core.database.models.product import Product, ProductFeedback
from backend.routes.google_bucket.schemas import MediaResponse, MediaSection
from backend.routes.google_bucket.utils import generate_download_url
from backend.routes.kupiprodai.schemas import *


async def get_media_responses(
    session: AsyncSession,
    request: Request,
    product_id: int,
    media_section: MediaSection,
) -> List[MediaResponse]:
    """
    Возвращает список MediaResponse для заданного продукта.
    """
    media_result = await session.execute(
        select(Media).filter(
            Media.entity_id == product_id, Media.section == media_section
        )
    )
    media_objects = media_result.scalars().all()

    # Если есть необходимость параллельной генерации URL, можно использовать asyncio.gather:
    async def build_media_response(media: Media) -> MediaResponse:
        url_data = await generate_download_url(request, media.name)
        return MediaResponse(
            id=media.id,
            url=url_data["signed_url"],
            mime_type=media.mime_type,
            section=media.section,
            entity_id=media.entity_id,
            media_purpose=media.media_purpose,
            media_order=media.media_order,
        )

    # Параллельное выполнение (опционально)
    return list(
        await asyncio.gather(*(build_media_response(media) for media in media_objects))
    )


async def build_product_response(
    product: Product,
    session: AsyncSession,
    request: Request,
    media_section: MediaSection,
) -> ProductResponseSchema:
    """
    Собирает ProductResponseSchema из объекта Product с учетом eagerly loaded user и media.
    """
    media_responses = await get_media_responses(
        session, request, product.id, media_section
    )
    return ProductResponseSchema(
        id=product.id,
        name=product.name,
        description=product.description,
        user_name=product.user.name,
        user_surname=product.user.surname,
        user_telegram_id=product.user.telegram_id,
        price=product.price,
        category=product.category,
        condition=product.condition,
        status=product.status,
        updated_at=product.updated_at,
        created_at=product.created_at,
        media=media_responses,
    )


async def build_product_feedbacks_response(
    feedback: ProductFeedback,
) -> ProductFeedbackResponseSchema:

    return ProductFeedbackResponseSchema(
        id=feedback.id,
        user_name=feedback.user.name,
        user_surname=feedback.user.surname,
        product_id=feedback.product_id,
        text=feedback.text,
        created_at=feedback.created_at,
    )


async def build_search_response(
    search_result: SearchResponseSchema,
) -> SearchResponseSchema:
    return SearchResponseSchema(id=search_result["id"], name=search_result["name"])
