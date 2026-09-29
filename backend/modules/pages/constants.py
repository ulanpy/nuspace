"""Pages module constants (not loaded from global app config)."""

from enum import Enum as PyEnum

MAX_PAGES_PER_OWNER = 100
MAX_PAGE_IMAGES = 20


class PageRole(PyEnum):
    """Which relationship to `/pages/mine` a caller wants.

    Re-added deliberately in `1344998`'s successor work; `b176a18` removed it
    along with the Owned/Admin tabs. The tabs rendered identical rows that both
    just link to the page, and the `role` filter's implementation leaked owned
    pages into the admin bucket. The leak is fixed by making the two values
    disjoint, not by keeping the parameter away — see
    `PageRepository._list_conditions`, which is where the constraint lives and
    where the docstring explaining it is.

    `admin` therefore means "administered by me and not owned by me". A page
    you own *and* administer belongs under `owner` only.
    """

    owner = "owner"
    admin = "admin"


class PageSort(PyEnum):
    """The columns `/pages/mine` may be ordered by.

    An enum, not a bare string, so that FastAPI rejects anything else with a
    422 and the OpenAPI doc lists the valid values — and so the repository's
    whitelist can be keyed by the same members instead of repeating three
    string literals that nothing checks agree.
    """

    name = "name"
    created_at = "created_at"
    visibility = "visibility"


class PageAdminSort(PyEnum):
    """The columns `/pages/{slug}/admins` may be ordered by.

    `name` is on `users`, not on `page_admins`, which is why that list needs a
    join and this one does not need a `role` filter: the owner is not in the
    admins list at all, so "owner vs admin" is a column there, not a filter.
    """

    name = "name"
    created_at = "created_at"
