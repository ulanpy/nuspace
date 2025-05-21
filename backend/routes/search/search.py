from fastapi import APIRouter, Query, Request
from httpx import HTTPError

from backend.common.utils import meilisearch
from backend.core.database.models.common_enums import EntityType
from backend.core.database.models.product import ProductStatus

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
        [f"status = {ProductStatus.active.value}"] if storage_name == EntityType.products else None
    )
    print(storage_name.value)
    try:
        result = await meilisearch.get(
            request=request,
            storage_name=storage_name.value,
            keyword=keyword,
            page=page,
            size=size,
            filters=filters,
        )
        print(result)
        return result["hits"]  # Return full entity details
    except HTTPError:
        # Error handling similar to pre_search
        pass
