"""Lexical retrieval: one Meilisearch `/multi-search` over every source's index.

Each index answers with its own ranked hits and an estimated total. The hits are
merged into one ranked list by Meilisearch's ranking score, which is comparable
across indexes (it is what federated search merges on). That list is the
lexical list `fusion.fuse` takes; dense retrieval (#441) adds a second.
"""

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

import httpx

from backend.modules.search import snippets
from backend.modules.search.schemas import Snippet
from backend.modules.search.sources import SourceIndex

logger = logging.getLogger(__name__)

# Meilisearch's `pagination.maxTotalHits`, left at its default: no index returns
# a hit past this rank, so neither does the merged list.
MAX_TOTAL_HITS = 1000


class SearchUnavailable(Exception):
    """Meilisearch could not answer."""


@dataclass(frozen=True)
class IndexQuery:
    source: SourceIndex
    limit: int  # 0 counts without returning hits
    filter: str | None = None


@dataclass(frozen=True)
class Hit:
    """One lexical hit: which Source, how well it matched, and the document it came from."""

    source: SourceIndex
    primary_key: int | str
    score: float
    document: dict[str, Any]
    snippet: Snippet | None

    @property
    def key(self) -> str:
        return f"{self.source.name}:{self.primary_key}"


@dataclass(frozen=True)
class LexicalResult:
    hits: list[Hit]  # merged, best first
    estimated_totals: dict[str, int]  # by source name; 0 for an index that is missing


def _payload(query: str, index_query: IndexQuery) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "indexUid": index_query.source.uid,
        "q": query,
        "limit": index_query.limit,
        "offset": 0,
        "showRankingScore": True,
    }
    if index_query.filter:
        payload["filter"] = index_query.filter
    crop = index_query.source.crop_attribute
    if crop and index_query.limit:
        payload |= {
            "attributesToCrop": [crop],
            "cropLength": snippets.CROP_WORDS,
            "attributesToHighlight": [crop],
            "highlightPreTag": snippets.PRE_TAG,
            "highlightPostTag": snippets.POST_TAG,
        }
    return payload


def _hits(index_query: IndexQuery, result: dict[str, Any]) -> list[Hit]:
    source = index_query.source
    hits = []
    for document in result.get("hits", []):
        formatted = document.pop("_formatted", None) or {}
        cropped = formatted.get(source.crop_attribute) if source.crop_attribute else None
        hits.append(
            Hit(
                source=source,
                primary_key=document["id"],
                score=float(document.pop("_rankingScore", 0.0)),
                document=document,
                snippet=snippets.from_highlighted(cropped) if isinstance(cropped, str) else None,
            )
        )
    return hits


class LexicalRetriever:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self.client = client

    async def retrieve(self, query: str, index_queries: Sequence[IndexQuery]) -> LexicalResult:
        """Search every index in one request and merge the hits by ranking score.

        An index that does not exist counts as empty: the catalogue index, for
        one, exists only once the registrar catalogue has been synced, and a
        multi-search fails whole if any of its indexes is missing.
        """
        try:
            results = await self._multi_search(query, index_queries)
        except _IndexMissing:
            existing = await self._index_uids()
            missing = [q.source.uid for q in index_queries if q.source.uid not in existing]
            logger.warning("Searching without missing indexes %s", missing)
            index_queries = [q for q in index_queries if q.source.uid in existing]
            results = await self._multi_search(query, index_queries)

        totals = {q.source.name: 0 for q in index_queries}
        merged: list[Hit] = []
        for index_query, result in zip(index_queries, results, strict=True):
            totals[index_query.source.name] = int(result.get("estimatedTotalHits", 0))
            merged.extend(_hits(index_query, result))
        # Stable: equal scores keep index order, then each index's own rank.
        merged.sort(key=lambda hit: -hit.score)
        return LexicalResult(hits=merged, estimated_totals=totals)

    async def _multi_search(
        self, query: str, index_queries: Sequence[IndexQuery]
    ) -> list[dict[str, Any]]:
        if not index_queries:
            return []
        try:
            response = await self.client.post(
                "/multi-search", json={"queries": [_payload(query, q) for q in index_queries]}
            )
        except httpx.HTTPError as exc:
            raise SearchUnavailable(str(exc)) from exc
        if response.status_code >= 400:
            body = _json(response)
            if body.get("code") == "index_not_found":
                raise _IndexMissing()
            raise SearchUnavailable(f"{response.status_code}: {body or response.text}")
        return response.json()["results"]

    async def _index_uids(self) -> set[str]:
        try:
            response = await self.client.get("/indexes", params={"limit": 1000})
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise SearchUnavailable(str(exc)) from exc
        return {index["uid"] for index in response.json()["results"]}


class _IndexMissing(Exception):
    pass


def _json(response: httpx.Response) -> dict[str, Any]:
    try:
        body = response.json()
    except ValueError:
        return {}
    return body if isinstance(body, dict) else {}
