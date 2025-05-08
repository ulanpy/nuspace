import asyncio
from typing import List

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.database.models import Club, ClubEvent
from backend.core.database.models.media import Media, MediaPurpose, MediaSection
from backend.routes.google_bucket.schemas import MediaResponse
from backend.routes.google_bucket.utils import generate_download_url



#
# async def build_media_response(request: Request, media: Media) -> MediaResponse:
#     url_data = await generate_download_url(request, media.name)
#     return MediaResponse(
#         id=media.id,
#         url=url_data["signed_url"],
#         mime_type=media.mime_type,
#         section=media.section,
#         entity_id=media.entity_id,
#         media_purpose=media.media_purpose,
#         media_order=media.media_order,
#     )
#
#
# u
