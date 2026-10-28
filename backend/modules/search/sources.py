"""The indexes search reads, one per structured source, and the coarse filters pushed into them.

A source is one index: Pages, events, opportunities, enrolled-course records,
grade reports and the registrar catalogue. Telegram channels (#442) and profile
pages (#440) join as more entries here.

The coarse filters are an optimisation, never the enforcement: they keep
Meilisearch from filling a page of hits with Sources the predicate will drop
(underfill). The predicate (`records.admits`) decides. A coarse filter must
therefore never exclude a Source the predicate admits, which is why a viewer's
own non-public Pages and events ride along by id.
"""

from collections.abc import Collection
from dataclasses import dataclass, field

from backend.modules.events.models import EventStatus
from backend.modules.pages.models import PageVisibility
from backend.modules.search.schemas import SearchKind

# Statuses every viewer reads; anything else only its creator and site admins.
OPEN_EVENT_STATUSES = frozenset({EventStatus.approved, EventStatus.cancelled})


@dataclass(frozen=True)
class SourceIndex:
    """One searchable source: its index, the kind it shows as, and what to crop."""

    name: str  # the result id's prefix: `page:12`
    kind: SearchKind
    uid: str
    # The indexed text a snippet is cropped from. None: the snippet comes from
    # the record (Pages until their body text is indexed, #439).
    crop_attribute: str | None = None


PAGES = SourceIndex("page", SearchKind.page, "pages")
EVENTS = SourceIndex("event", SearchKind.event, "events", crop_attribute="description")
OPPORTUNITIES = SourceIndex(
    "opportunity", SearchKind.opportunity, "opportunities", crop_attribute="description"
)
COURSES = SourceIndex("course", SearchKind.course, "courses")
GRADE_REPORTS = SourceIndex("grade_report", SearchKind.course, "grade_reports")
CATALOGUE = SourceIndex("catalogue", SearchKind.course, "course_schedule_catalog")

# Order breaks ties between equal ranking scores.
SOURCES: tuple[SourceIndex, ...] = (
    PAGES,
    EVENTS,
    OPPORTUNITIES,
    COURSES,
    GRADE_REPORTS,
    CATALOGUE,
)


@dataclass(frozen=True)
class Reach:
    """What a viewer may read, coarsely, as the filters pushed into Meilisearch.

    `page_tiers` / `event_statuses` of None mean every one (a site admin). The id
    sets are the viewer's own Sources outside those, which the predicate admits.
    """

    page_tiers: frozenset[PageVisibility] | None
    event_statuses: frozenset[EventStatus] | None
    managed_page_ids: Collection[int] = field(default_factory=frozenset)
    own_event_ids: Collection[int] = field(default_factory=frozenset)


def _any_of(attribute: str, values: Collection[str], ids: Collection[int]) -> str:
    quoted = ", ".join(f'"{value}"' for value in sorted(values))
    clause = f"{attribute} IN [{quoted}]"
    if ids:
        clause += f" OR id IN [{', '.join(str(i) for i in sorted(ids))}]"
    return clause


def coarse_filter(source: SourceIndex, reach: Reach) -> str | None:
    """The Meilisearch filter for `source`, or None to search it unfiltered."""
    if source is PAGES and reach.page_tiers is not None:
        return _any_of(
            "visibility", [tier.value for tier in reach.page_tiers], reach.managed_page_ids
        )
    if source is EVENTS and reach.event_statuses is not None:
        return _any_of(
            "status", [status.value for status in reach.event_statuses], reach.own_event_ids
        )
    return None
