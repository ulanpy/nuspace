from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

from backend.modules.pages.models import PageVisibility


class SearchKind(str, Enum):
    """What a Source is, as the kind chips name it.

    One kind may span several indexes: `course` is enrolled-course records, grade
    reports and the registrar catalogue alike.
    """

    page = "page"
    event = "event"
    opportunity = "opportunity"
    course = "course"


class MatchSpan(BaseModel):
    """A matched stretch of the snippet, in UTF-16 code units (JavaScript string indices)."""

    start: int
    length: int


class Snippet(BaseModel):
    text: str
    matches: list[MatchSpan] = Field(default_factory=list)


class SourceDate(BaseModel):
    """The date a result shows, and what it is the date of."""

    role: Literal["updated", "starts", "deadline"]
    value: datetime | date


class SearchResult(BaseModel):
    id: str = Field(description="Unique across kinds: `<source>:<primary key>`, e.g. `page:12`.")
    kind: SearchKind
    title: str
    url: str = Field(description="The Source's canonical address, bare.")
    host: str = Field(description="The breadcrumb's host, e.g. `pages.nuspace.kz`.")
    path: str = Field(description="The breadcrumb's path, without a leading slash; may be empty.")
    date: SourceDate | None = None
    snippet: Snippet | None = None
    visibility: PageVisibility | None = Field(
        default=None, description="Set only when the Source is not public."
    )
    facts: list[str] = Field(
        default_factory=list, description="Kind-specific facts, in display order."
    )


class SearchResponse(BaseModel):
    query: str
    kind: SearchKind | None
    offset: int
    limit: int
    results: list[SearchResult]
    estimated_total: int = Field(
        description="Estimated matches for `kind` (or every kind), before the visibility "
        'predicate. Shown as "About N".'
    )
    counts: dict[SearchKind, int] = Field(
        description="Estimated matches per kind, whatever `kind` is."
    )
    next_offset: int | None = Field(
        description="Where the next page starts; null past the last page or `maxTotalHits`."
    )
