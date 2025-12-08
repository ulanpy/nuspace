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
    filters = []
    try:
        # We need to avoid duplicate hits (e.g., identical BUS 101 rows) and
        # still return up to `size` unique results. Fetch successive pages from
        # Meilisearch until we accumulate the requested window of unique items.
        target_start = (page - 1) * size
        target_end = target_start + size

        def _norm(value):
            return value.strip().lower() if isinstance(value, str) else value

        def build_dedupe_key(hit: dict):
            """
            Build a dedupe key per storage. For grade reports we want one row per
            course (code + title) regardless of faculty/section/term duplicates.
            """
            if storage_name == EntityType.grade_reports:
                key_fields = (
                    _norm(hit.get("course_code")),
                    _norm(hit.get("course_title")),
                )
            else:
                key_fields = (
                    _norm(hit.get("course_code")),
                    _norm(hit.get("course_title")),
                    _norm(hit.get("faculty")),
                    _norm(hit.get("section")),
                    _norm(hit.get("term")),
                )
            # Fallback to id if no meaningful fields exist
            return key_fields if any(key_fields) else hit.get("id")

        unique_hits = []
        seen_keys = set()

        current_page = 1
        total_hits = None

        while len(unique_hits) < target_end:
            result = await meilisearch.get(
                client=request.app.state.meilisearch_client,
                storage_name=storage_name.value,
                keyword=keyword,
                page=current_page,
                size=size,
                filters=filters,
            )

            hits = result.get("hits", [])
            if total_hits is None:
                total_hits = result.get("estimatedTotalHits", len(hits))

            if not hits:
                break

            for hit in hits:
                key = build_dedupe_key(hit)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                unique_hits.append(hit)
                if len(unique_hits) >= target_end:
                    break

            # Stop if we've exhausted all available hits
            if total_hits is not None and current_page * size >= total_hits:
                break

            current_page += 1

        # Return only the slice for the requested page, after deduplication
        return unique_hits[target_start:target_end]
    except HTTPError:
        # Error handling similar to pre_search
        pass
