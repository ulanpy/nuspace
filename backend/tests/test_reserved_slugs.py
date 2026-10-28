"""The reserved slugs cannot drift from what they mirror.

`RESERVED_SLUGS` (`modules/shared/slug.py`) is the list; three copies outside
it have to agree, and none can be imported here:

- the build root. Everything in `web/public/` is copied there, and nginx serves
  it on every host before the router, so a Page named after it is unreachable
  at `pages.nuspace.kz/<slug>`.
- the frontend's copy in `web/src/lib/slug.ts`, which validates the same forms
  before they are sent.
- the database's `validate_slug()`, which the `chk_pages_slug` constraint asks,
  so a writer that skips the app still cannot store a reserved slug. Checked
  over a real connection (the test stores in `tests/README.md`).
"""

import re
from pathlib import Path

import pytest
from sqlalchemy import text

from backend.modules.shared.slug import BUILD_ROOT_FILES, RESERVED_SLUGS

WEB = Path(__file__).resolve().parents[2] / "web"


def test_every_entry_at_the_build_root_is_reserved() -> None:
    public = {entry.name for entry in (WEB / "public").iterdir()}

    assert public, "web/public/ is empty or missing"
    assert public == BUILD_ROOT_FILES


def test_the_frontend_reserves_the_same_slugs() -> None:
    source = (WEB / "src" / "lib" / "slug.ts").read_text()
    block = re.search(r"RESERVED_SLUGS[^=]*=\s*\[(.*?)\]", source, re.DOTALL)

    assert block, "RESERVED_SLUGS not found in web/src/lib/slug.ts"
    assert set(re.findall(r'"([^"]+)"', block.group(1))) == RESERVED_SLUGS


@pytest.mark.asyncio
async def test_the_database_refuses_every_reserved_slug(db) -> None:
    async with db.begin() as session:
        accepted = (
            await session.execute(
                text("SELECT s FROM unnest(CAST(:slugs AS text[])) AS s WHERE validate_slug(s)"),
                {"slugs": sorted(RESERVED_SLUGS)},
            )
        ).scalars()
        assert list(accepted) == []
        assert (await session.execute(text("SELECT validate_slug('chess-club')"))).scalar()
