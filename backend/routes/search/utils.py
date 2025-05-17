from typing import List

from fastapi import Request

from backend.common.utils import meilisearch


async def pre_search(request: Request, keyword: str, storage_name: str) -> List[str]:
    """
    Fetch search suggestions from Meilisearch.

    Parameters:
    - `request` (Request): FastAPI request object.
    - `keyword` (str): Search term.
    - `storage_name` (str): Index name.

    Returns:
    - `List[str]`: Distinct search suggestions (max 5).
    """
    seen = set()
    distinct_keywords = []
    page = 1

    while len(distinct_keywords) < 5:
        result = await meilisearch.get(
            request=request,
            storage_name=storage_name,
            keyword=keyword,
            page=page,
            size=20,
        )
        hits = result.get("hits", [])
        if not hits:
            break

        for obj in hits:
            name = obj.get("name")
            if name and name not in seen:
                seen.add(name)
                distinct_keywords.append(name)
                if len(distinct_keywords) >= 5:
                    break

        page += 1
    return distinct_keywords
