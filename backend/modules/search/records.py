"""A Source as search shows it, read from its own store, and who may see it.

Hits only say which Sources matched. What a result shows, and whether this
viewer may see it at all, come from the Source's record: Postgres for the
table-backed sources, the hit itself for the registrar catalogue (which lives
only in Meilisearch). Reading Postgres rather than trusting the index means a
stale index document can never widen what a viewer sees.

Each record carries its `gate`, the read predicate for its kind:

- Pages: `visible_to`, the one Visibility predicate (ADR 0011).
- Events: approved or cancelled for everyone; any status for its creator and
  site admins, as `EventPolicy.check_read_one` reads one.
- Opportunities, courses, grade reports and the catalogue: ungated.
"""

import re
from dataclasses import dataclass
from datetime import date
from typing import Any, Protocol

from backend.common import canonical
from backend.common.canonical import Location
from backend.modules.auth.dependencies import is_guest
from backend.modules.courses.models import Course, GradeReport
from backend.modules.events.models import Event, EventStatus
from backend.modules.opportunities.models import Opportunity
from backend.modules.pages.models import Page, PageVisibility
from backend.modules.search.schemas import SearchKind, SourceDate
from backend.modules.search.sources import (
    CATALOGUE,
    COURSES,
    EVENTS,
    GRADE_REPORTS,
    OPEN_EVENT_STATUSES,
    OPPORTUNITIES,
    PAGES,
    SourceIndex,
    source_key,
)
from backend.modules.shared.visibility import RecordVisibility, is_site_admin, visible_to

# The credentials pair `get_creds_or_guest` returns.
Principal = tuple[dict, dict]


class Gate(Protocol):
    def admits(self, viewer: Principal) -> bool: ...


@dataclass(frozen=True)
class Ungated:
    def admits(self, viewer: Principal) -> bool:
        return True


@dataclass(frozen=True)
class Tiered:
    visibility: RecordVisibility

    def admits(self, viewer: Principal) -> bool:
        return visible_to(viewer, self.visibility)


@dataclass(frozen=True)
class EventGate:
    status: EventStatus
    creator_sub: str | None

    def admits(self, viewer: Principal) -> bool:
        if self.status in OPEN_EVENT_STATUSES or is_site_admin(viewer):
            return True
        return not is_guest(viewer) and viewer[0].get("sub") == self.creator_sub


@dataclass(frozen=True)
class Record:
    source: SourceIndex
    primary_key: int | str
    title: str
    location: Location
    gate: Gate
    date: SourceDate | None = None
    # A snippet's text when Meilisearch cropped none.
    text: str | None = None
    facts: tuple[str, ...] = ()
    visibility: PageVisibility | None = None

    @property
    def key(self) -> str:
        return source_key(self.source, self.primary_key)

    @property
    def kind(self) -> SearchKind:
        return self.source.kind


def _clean(text: Any) -> str:
    """One line: catalogue titles carry the PDF's line breaks."""
    return re.sub(r"\s+", " ", str(text)).strip() if text is not None else ""


def _facts(*values: Any) -> tuple[str, ...]:
    return tuple(cleaned for value in values if (cleaned := _clean(value)))


def _label(value: Any) -> str:
    """An enum value as words: `summer_school` → `Summer school`."""
    raw = getattr(value, "value", value)
    return _clean(str(raw).replace("_", " ")).capitalize() if raw else ""


def _coded_title(code: Any, title: Any) -> str:
    code, title = _clean(code), _clean(title)
    return f"{code} · {title}" if code and title else code or title


def _credits(value: Any) -> str:
    if value in (None, ""):
        return ""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return ""
    return f"{number:g} credits"


def page_record(
    page: Page, *, owner_name: str | None, viewer_sub: str | None, viewer_is_admin: bool
) -> Record:
    # The predicate asks only whether this viewer manages the Page, so the
    # viewer stands in for its admins (as `pages.policy.page_visibility` does).
    managers = {page.owner, viewer_sub} if viewer_is_admin else {page.owner}
    return Record(
        source=PAGES,
        primary_key=page.id,
        title=_clean(page.name),
        location=canonical.page(page.slug),
        gate=Tiered(RecordVisibility(tier=page.visibility, managers=managers)),
        date=SourceDate(role="updated", value=page.updated_at),
        text=page.description,
        facts=_facts(f"Owner {owner_name}" if owner_name else None),
        visibility=None if page.visibility == PageVisibility.public else page.visibility,
    )


def event_record(event: Event) -> Record:
    return Record(
        source=EVENTS,
        primary_key=event.id,
        title=_clean(event.name),
        location=canonical.event(event.id),
        gate=EventGate(status=event.status, creator_sub=event.creator_sub),
        date=SourceDate(role="starts", value=event.start_datetime),
        text=event.description,
        facts=_facts(
            _label(event.type),
            event.place,
            None if event.status == EventStatus.approved else _label(event.status),
        ),
    )


def opportunity_record(opportunity: Opportunity) -> Record:
    deadline: date | None = opportunity.deadline
    return Record(
        source=OPPORTUNITIES,
        primary_key=opportunity.id,
        title=_clean(opportunity.name),
        location=canonical.OPPORTUNITIES,
        gate=Ungated(),
        date=SourceDate(role="deadline", value=deadline) if deadline else None,
        text=opportunity.description,
        facts=_facts(
            _label(opportunity.type), opportunity.host, opportunity.location, opportunity.funding
        ),
    )


def course_record(course: Course) -> Record:
    return Record(
        source=COURSES,
        primary_key=course.id,
        title=_coded_title(course.course_code, course.title),
        location=canonical.COURSES,
        gate=Ungated(),
        facts=_facts(course.term, _credits(course.credits), course.level, course.school),
    )


def grade_report_record(report: GradeReport) -> Record:
    return Record(
        source=GRADE_REPORTS,
        primary_key=report.id,
        title=_coded_title(report.course_code, report.course_title),
        location=canonical.GRADE_REPORTS,
        gate=Ungated(),
        facts=_facts(
            report.term,
            f"Section {report.section}" if report.section else None,
            report.faculty,
            f"Average GPA {float(report.avg_gpa):.2f}" if report.avg_gpa is not None else None,
            f"{report.grades_count} grades" if report.grades_count else None,
        ),
    )


def catalogue_record(document: dict[str, Any]) -> Record:
    faculty = []
    for section in document.get("sections") or []:
        name = _clean(section.get("faculty"))
        if name and name not in faculty:
            faculty.append(name)
    return Record(
        source=CATALOGUE,
        primary_key=document["id"],
        title=_coded_title(document.get("course_code"), document.get("title")),
        location=canonical.CATALOGUE,
        gate=Ungated(),
        facts=_facts(
            document.get("term"),
            _credits(document.get("credits_us") or document.get("credits_ects")),
            document.get("level"),
            document.get("school"),
            ", ".join(faculty[:2]),
        ),
    )
