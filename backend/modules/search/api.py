from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.modules.auth.dependencies import get_creds_or_guest
from backend.modules.search.dependencies import get_search_service
from backend.modules.search.retrieval import SearchUnavailable
from backend.modules.search.schemas import SearchKind, SearchResponse
from backend.modules.search.service import SearchService

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/results", response_model=SearchResponse)
async def search_results(
    viewer: Annotated[tuple[dict, dict], Depends(get_creds_or_guest)],
    service: Annotated[SearchService, Depends(get_search_service)],
    q: Annotated[str, Query(max_length=256, description="What to search for.")],
    kind: Annotated[SearchKind | None, Query(description="Only this kind of Source.")] = None,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
) -> SearchResponse:
    """Ranked Sources from every structured source that this viewer may open.

    Anyone may search; what comes back follows the viewer (ADR 0011). The pager
    is stateless: ask again with a larger `offset`, and dedupe by `id`. Past
    Meilisearch's `maxTotalHits` (1,000) the results are empty.
    """
    try:
        return await service.search(viewer, query=q, kind=kind, offset=offset, limit=limit)
    except SearchUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Search is unavailable"
        ) from exc
