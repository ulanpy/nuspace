"""Where each kind of Source lives: its service, and its path on that service's host.

The backend's one copy of the canonical addresses in the route table
(`web/src/lib/hosts/constants.ts`, the source of truth, and the spec's table in
#416). When a route moves there, change its line here. Combine a `Location`
with `config.service_origin(location.service)` for the absolute URL: the origin
comes from the environment, never from a request header.

Links are bare: no `?q=`, no filters, no focus. A Source that has no address of
its own (an opportunity, a course, a grade report) points at the screen that
lists it.
"""

from dataclasses import dataclass
from urllib.parse import quote

from backend.common.service_origin import Service


@dataclass(frozen=True)
class Location:
    """A path on one of the six hosts. `path` starts with `/`."""

    service: Service
    path: str

    def url(self, origin: str) -> str:
        """The absolute URL on `origin` (the service's origin, no trailing slash)."""
        return f"{origin}{self.path}"


def page(slug: str) -> Location:
    return Location("pages", f"/{quote(slug)}")


def event(event_id: int) -> Location:
    return Location("events", f"/{event_id}")


OPPORTUNITIES = Location("opportunities", "/")
COURSES = Location("courses", "/")
GRADE_REPORTS = Location("courses", "/stats")
CATALOGUE = Location("courses", "/planner")
