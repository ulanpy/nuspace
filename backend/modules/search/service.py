"""Search across every structured source: retrieve, merge, predicate, slice.

1. **Retrieve.** One lexical list from Meilisearch (`retrieval`), with the coarse
   filters for this viewer pushed down (`sources.coarse_filter`). Every index
   is asked for its top `offset + limit`, so the pager is stateless: page two
   refetches pages one and two, re-merges and slices.
2. **Merge.** `fusion.fuse` over the ranked lists. Dense retrieval (#441) adds
   its list there.
3. **Predicate.** Each Source's record is read from its store and its gate
   decides (`records`). This is the enforcement; the coarse filters only
   limit underfill.
4. **Slice** `[offset, offset + limit)` of what survived.

Counts are Meilisearch's estimates, per kind, after the coarse filters and
before the predicate, so they are shown as "About N".

`search` is what the HTTP endpoint calls, and what the AI Overview (#445) is to
call to re-run the same search for the same viewer server-side.
"""

from collections import defaultdict
from collections.abc import Callable, Sequence
from urllib.parse import urlsplit

from backend.common.service_origin import Service
from backend.core.database.uow import UnitOfWork
from backend.modules.auth.dependencies import is_guest
from backend.modules.search import records as build
from backend.modules.search import snippets
from backend.modules.search.fusion import fuse
from backend.modules.search.records import Record, Viewer
from backend.modules.search.repository import SearchRepository
from backend.modules.search.retrieval import (
    MAX_TOTAL_HITS,
    Hit,
    IndexQuery,
    LexicalRetriever,
)
from backend.modules.search.schemas import (
    SearchKind,
    SearchResponse,
    SearchResult,
)
from backend.modules.search.sources import (
    CATALOGUE,
    COURSES,
    EVENTS,
    GRADE_REPORTS,
    OPEN_EVENT_STATUSES,
    OPPORTUNITIES,
    PAGES,
    SOURCES,
    Reach,
    SourceIndex,
    coarse_filter,
)
from backend.modules.shared.visibility import is_site_admin, tiers_open_to

SOURCES_BY_NAME = {source.name: source for source in SOURCES}

# Records are read in batches of at least this many candidates, best first,
# until a page's worth has passed the predicate.
MIN_BATCH = 20


class SearchService:
    def __init__(
        self,
        uow: UnitOfWork,
        retriever: LexicalRetriever,
        service_origin: Callable[[Service], str],
    ) -> None:
        self.uow = uow
        self.retriever = retriever
        self.service_origin = service_origin

    async def search(
        self,
        viewer: Viewer,
        *,
        query: str,
        kind: SearchKind | None = None,
        offset: int = 0,
        limit: int = 10,
    ) -> SearchResponse:
        query = query.strip()
        selected = [source for source in SOURCES if kind is None or source.kind == kind]
        wanted = offset + limit
        window = min(wanted, MAX_TOTAL_HITS)

        admitted: list[tuple[Record, Hit | None]] = []
        totals: dict[str, int] = {}
        if query:
            async with self.uow:
                repo = self.uow.get_repo(SearchRepository)
                reach = await self._reach(repo, viewer)
                lexical = await self.retriever.retrieve(
                    query,
                    [
                        IndexQuery(
                            source=source,
                            # The other kinds are asked only for their counts.
                            limit=window if source in selected else 0,
                            filter=coarse_filter(source, reach),
                        )
                        for source in SOURCES
                    ],
                )
                totals = lexical.estimated_totals
                hits = {hit.key: hit for hit in lexical.hits}
                ranked = fuse([[hit.key for hit in lexical.hits]])[:MAX_TOTAL_HITS]
                admitted = await self._admit(repo, viewer, ranked, hits, wanted=wanted)

        counts = {each: 0 for each in SearchKind}
        for name, total in totals.items():
            counts[SOURCES_BY_NAME[name].kind] += total
        estimated_total = sum(counts[source_kind] for source_kind in {s.kind for s in selected})
        has_next = wanted < min(estimated_total, MAX_TOTAL_HITS)
        return SearchResponse(
            query=query,
            kind=kind,
            offset=offset,
            limit=limit,
            results=[self._result(record, hit) for record, hit in admitted[offset:wanted]],
            estimated_total=estimated_total,
            counts=counts,
            next_offset=wanted if has_next else None,
        )

    async def _reach(self, repo: SearchRepository, viewer: Viewer) -> Reach:
        if is_site_admin(viewer):
            return Reach(page_tiers=None, event_statuses=None)
        tiers = tiers_open_to(viewer)
        if is_guest(viewer):
            return Reach(page_tiers=tiers, event_statuses=OPEN_EVENT_STATUSES)
        sub = viewer[0]["sub"]
        return Reach(
            page_tiers=tiers,
            event_statuses=OPEN_EVENT_STATUSES,
            managed_page_ids=await repo.managed_page_ids(sub, outside=tiers),
            own_event_ids=await repo.own_event_ids(sub, outside=OPEN_EVENT_STATUSES),
        )

    async def _admit(
        self,
        repo: SearchRepository,
        viewer: Viewer,
        ranked: Sequence[str],
        hits: dict[str, Hit],
        *,
        wanted: int,
    ) -> list[tuple[Record, Hit | None]]:
        """The ranked Sources this viewer may see, best first, at least `wanted` if there are."""
        admitted: list[tuple[Record, Hit | None]] = []
        batch = max(wanted, MIN_BATCH)
        for start in range(0, len(ranked), batch):
            keys = ranked[start : start + batch]
            records = await self._records(repo, viewer, keys, hits)
            for key in keys:
                record = records.get(key)
                # No record: the row is gone and the index has not caught up.
                if record is not None and record.gate.admits(viewer):
                    admitted.append((record, hits.get(key)))
            if len(admitted) >= wanted:
                break
        return admitted

    async def _records(
        self, repo: SearchRepository, viewer: Viewer, keys: Sequence[str], hits: dict[str, Hit]
    ) -> dict[str, Record]:
        wanted: dict[SourceIndex, list] = defaultdict(list)
        for key in keys:
            name, _, primary_key = key.partition(":")
            source = SOURCES_BY_NAME[name]
            wanted[source].append(primary_key if source is CATALOGUE else int(primary_key))

        found: list[Record] = []
        if ids := wanted.get(PAGES):
            sub = None if is_guest(viewer) else viewer[0]["sub"]
            administered = await repo.administered_among(sub, ids) if sub else set()
            found += [
                build.page_record(
                    page,
                    owner_name=_full_name(page.owner_user),
                    viewer_sub=sub,
                    viewer_is_admin=page.id in administered,
                )
                for page in await repo.pages(ids)
            ]
        if ids := wanted.get(EVENTS):
            found += [build.event_record(event) for event in await repo.events(ids)]
        if ids := wanted.get(OPPORTUNITIES):
            found += [build.opportunity_record(row) for row in await repo.opportunities(ids)]
        if ids := wanted.get(COURSES):
            found += [build.course_record(row) for row in await repo.courses(ids)]
        if ids := wanted.get(GRADE_REPORTS):
            found += [build.grade_report_record(row) for row in await repo.grade_reports(ids)]
        for primary_key in wanted.get(CATALOGUE, []):
            # The catalogue lives only in Meilisearch: its hit is its record.
            if hit := hits.get(f"{CATALOGUE.name}:{primary_key}"):
                found.append(build.catalogue_record(hit.document))
        return {record.key: record for record in found}

    def _result(self, record: Record, hit: Hit | None) -> SearchResult:
        origin = self.service_origin(record.location.service)
        return SearchResult(
            id=record.key,
            kind=record.kind,
            title=record.title,
            url=record.location.url(origin),
            host=urlsplit(origin).netloc,
            path=record.location.path.lstrip("/"),
            date=record.date,
            snippet=(hit.snippet if hit else None) or snippets.from_text(record.text),
            visibility=record.visibility,
            facts=list(record.facts),
        )


def _full_name(user) -> str | None:
    if user is None:
        return None
    return " ".join(part for part in (user.name, user.surname) if part) or None
