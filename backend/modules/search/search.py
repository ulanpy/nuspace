from fastapi import APIRouter, Query, Request
from httpx import HTTPError

from backend.common.utils import meilisearch
from backend.core.database.models.common_enums import EntityType

router = APIRouter(tags=["Search Routes"])


@router.get("/search/")
async def full_search(
    request: Request,
    keyword: str,
    storage_name: EntityType,
    page: int = 1,
    size: int = Query(10, ge=1, le=30),
):
    """
    Full search implementation returning complete entity details
    """
    filters = (
        []
    )
    try:
        result = await meilisearch.get(
            client=request.app.state.meilisearch_client,
            storage_name=storage_name.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=filters,
        )
        return result["hits"]  # Return full entity details
    except HTTPError:
        # Error handling similar to pre_search
        pass
