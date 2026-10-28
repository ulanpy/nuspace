"""`visible_to` on records that are not Pages yet, and on principals HTTP cannot send.

Pages are tested through the HTTP seam (`pages/tests/test_page_visibility_http.py`).
These cases cover two things that seam cannot reach yet. One is a profile-shaped
record, whose only manager is the person, which is how profile pages, the
people directory and search will call the predicate. The other is a banned
principal that has not been turned into a guest.
"""

import pytest
from backend.modules.pages.models.page import PageVisibility
from backend.modules.shared.visibility import (
    ALL_TIERS,
    ANONYMOUS_TIERS,
    MEMBER_TIERS,
    RecordVisibility,
    tiers_open_to,
    visible_to,
)

GUEST = ({"sub": "guest"}, {"role": "default", "is_guest": True, "scope": "allowed"})
MEMBER = ({"sub": "member"}, {"role": "default", "scope": "allowed"})
BANNED = ({"sub": "banned"}, {"role": "default", "scope": "banned"})
PERSON = ({"sub": "person"}, {"role": "default", "scope": "allowed"})
SITE_ADMIN = ({"sub": "root"}, {"role": "admin", "scope": "allowed"})


def _profile(tier: PageVisibility) -> RecordVisibility:
    return RecordVisibility(tier=tier, managers={"person"})


@pytest.mark.parametrize(
    ("viewer", "tier", "expected"),
    [
        pytest.param(GUEST, PageVisibility.public, True, id="public-guest"),
        pytest.param(GUEST, PageVisibility.internal, False, id="internal-guest"),
        pytest.param(GUEST, PageVisibility.private, False, id="private-guest"),
        pytest.param(MEMBER, PageVisibility.internal, True, id="internal-member"),
        pytest.param(MEMBER, PageVisibility.private, False, id="private-member"),
        pytest.param(BANNED, PageVisibility.public, True, id="public-banned"),
        pytest.param(BANNED, PageVisibility.internal, False, id="internal-banned"),
        pytest.param(PERSON, PageVisibility.private, True, id="private-the-person"),
        pytest.param(SITE_ADMIN, PageVisibility.private, True, id="private-site-admin"),
    ],
)
def test_a_profile_follows_the_tiers(
    viewer: tuple[dict, dict], tier: PageVisibility, expected: bool
) -> None:
    assert visible_to(viewer, _profile(tier)) is expected


def test_the_guest_never_manages_a_record() -> None:
    """The guest's sub is the string "guest", so a record whose manager list
    somehow held it must still not open to every anonymous caller."""
    record = RecordVisibility(tier=PageVisibility.private, managers={"guest"})

    assert visible_to(GUEST, record) is False


def test_an_ownerless_record_opens_to_no_manager() -> None:
    record = RecordVisibility(tier=PageVisibility.private, managers={None})

    assert visible_to(MEMBER, record) is False


@pytest.mark.parametrize(
    ("viewer", "tiers"),
    [
        (GUEST, ANONYMOUS_TIERS),
        (BANNED, ANONYMOUS_TIERS),
        (MEMBER, MEMBER_TIERS),
        (SITE_ADMIN, ALL_TIERS),
    ],
    ids=["guest", "banned", "member", "site_admin"],
)
def test_a_list_narrows_by_the_same_tiers(viewer: tuple[dict, dict], tiers: frozenset) -> None:
    """What a list puts in its WHERE is the predicate with managers left out."""
    assert tiers_open_to(viewer) == tiers
    for tier in PageVisibility:
        assert (tier in tiers) is visible_to(viewer, RecordVisibility(tier=tier))
