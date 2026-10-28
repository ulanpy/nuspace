"""The reserved slugs cannot drift from what they mirror.

`RESERVED_SLUGS` (`modules/shared/slug.py`) is the list; two things outside the
backend have to agree with it, and neither can be imported here:

- the build root. Everything in `web/public/` is copied there, and nginx serves
  it on every host before the router, so a Page named after it is unreachable
  at `pages.nuspace.kz/<slug>`.
- the frontend's copy in `web/src/lib/slug.ts`, which validates the same forms
  before they are sent.

The database's copy is checked over a real connection in
`modules/pages/tests/test_page_slugs_http.py`.
"""

import re
from pathlib import Path

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
