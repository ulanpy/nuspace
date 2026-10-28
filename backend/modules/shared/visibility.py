"""Who may read a record that carries a Visibility tier. The one predicate.

Every read of such a record asks `visible_to`: a Page by slug or by id, the
Pages directory, and later search, the people directory and profile pages.
Nothing else decides it. ADR 0011 records why, and what "member" rests on.

- `public`: everyone, anonymous viewers included.
- `internal` ("Members only"): not a guest **and** `users.scope = allowed`, so
  a ban takes member access away.
- `private`: the record's managers and site admins. For a Page the managers are
  its owner and its admins; for a profile page, the person.

A caller that is told no answers 404, never 403. A 403 tells someone with no
business knowing it that the record exists.

How to call it:

- **One record.** Build its `RecordVisibility` and ask
  `visible_to(viewer, record)`. `managers` only has to settle whether *this
  viewer* manages the record, so a caller that has already asked "is the viewer
  an admin of this Page" can pass `{owner, viewer}` or `{owner}` rather than
  load every admin.
- **A list from SQL or a search index.** Narrow the query with
  `tiers_open_to(viewer)`, the tiers this viewer reads without managing the
  record. It is the predicate with `managers` left out, not a second copy of
  it, so a list and a read cannot disagree about a tier. Then keep the rows
  `visible_to` admits.
"""

from collections.abc import Collection
from dataclasses import dataclass

from backend.modules.auth.dependencies import is_guest
from backend.modules.auth.models import UserRole, UserScope
from backend.modules.pages.models.page import PageVisibility

ALL_TIERS = frozenset(PageVisibility)
MEMBER_TIERS = frozenset({PageVisibility.public, PageVisibility.internal})
ANONYMOUS_TIERS = frozenset({PageVisibility.public})


@dataclass(frozen=True)
class RecordVisibility:
    """What the predicate needs to know about a record: its tier, and who manages it.

    `managers` are the Keycloak subs that read the record at every tier. A Page's
    owner may be None (the owner's account is gone), which matches no viewer.
    """

    tier: PageVisibility
    managers: Collection[str | None] = ()


def is_member(viewer: tuple[dict, dict]) -> bool:
    """Signed in and not banned: who reads `internal`.

    Signed in is only half of it. Being a member at all rests on the production
    Keycloak realm admitting only `@nu.edu.kz` Google accounts, with
    self-registration off (ADR 0011). The scope is read off the app claims,
    which carry `users.scope` as of the app token's issue.
    """
    return not is_guest(viewer) and viewer[1].get("scope") == UserScope.allowed.value


def is_site_admin(viewer: tuple[dict, dict]) -> bool:
    return not is_guest(viewer) and viewer[1].get("role") == UserRole.admin.value


def tiers_open_to(viewer: tuple[dict, dict]) -> frozenset[PageVisibility]:
    """The tiers this viewer reads without managing the record."""
    if is_site_admin(viewer):
        return ALL_TIERS
    if is_member(viewer):
        return MEMBER_TIERS
    return ANONYMOUS_TIERS


def visible_to(viewer: tuple[dict, dict], record: RecordVisibility) -> bool:
    """May this viewer read this record? Anything that answers no is a 404."""
    if record.tier in tiers_open_to(viewer):
        return True
    return not is_guest(viewer) and viewer[0].get("sub") in record.managers
