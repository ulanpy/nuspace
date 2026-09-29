"""Temporary unauthenticated draft endpoint; move it with the Pages domain."""

import logging
import os

from fastapi import APIRouter, HTTPException, status
from openai import RateLimitError

from backend.modules.agent.page_draft import (
    PageDraftRequest,
    PageDraftResponse,
    PageDraftService,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agent", tags=["Temporary Agent Routes"])


@router.post("/page-drafts", response_model=PageDraftResponse)
async def generate_page_draft(body: PageDraftRequest) -> PageDraftResponse:
    """Generate a review-only Puck page JSON document from a user brief.

    This endpoint deliberately has no authentication only while the Pages UX
    is being prototyped. It does not store or publish its response.
    """

    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Page draft generation is not configured",
        )
    try:
        return await PageDraftService().generate(body)
    except RateLimitError as exc:
        logger.warning("Page draft generation was rejected by the model provider: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="The configured OpenAI account has no available API quota",
        ) from exc
    except Exception as exc:
        logger.exception("Page draft generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Page draft generation failed",
        ) from exc
