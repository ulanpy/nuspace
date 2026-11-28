"""The reserved slugs cannot drift from what they mirror.

`RESERVED_SLUGS` (`modules/shared/slug.py`) is the list; four things outside
it have to agree, and none can be imported here:

- nginx's own locations on the app hosts (`infra/nginx/nginx.conf` and
  `nginx.dev.conf`). Each must name a reserved first segment, and a prefix
  location must end in `/`: `location /api` would also take `/api-club`.
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

REPO = Path(__file__).resolve().parents[2]
WEB = REPO / "web"
NGINX = REPO / "infra" / "nginx"

# `location [modifier] path {`, path only for a literal (non-regex) location.
_LOCATION = re.compile(r"^\s*location\s+(=|\^~)?\s*(/[^\s{]*)\s*\{", re.MULTILINE)
# Regex locations: the literal first segments they can match a path under.
_REGEX_SEGMENTS = re.compile(r"(?<![?!])(?<!\(\?)\b([a-z_]+)/")


def _app_servers(conf: str) -> list[str]:
    """The `server` blocks that serve the six hosts: the ones that hand a path
    to a host's route (`@og_preview` is the bot side of that), not the VPN's."""
    return [block for block in conf.split("server {") if "@og_preview" in block]


@pytest.mark.parametrize("conf", ["nginx.conf", "nginx.dev.conf"])
def test_every_path_nginx_keeps_on_an_app_host_is_reserved(conf: str) -> None:
    servers = _app_servers((NGINX / conf).read_text())
    assert servers, f"no app server block found in {conf}"

    for server in servers:
        for modifier, path in _LOCATION.findall(server):
            if path == "/":
                continue
            first = path.strip("/").split("/")[0]
            assert first in RESERVED_SLUGS, f"{conf}: location {path}"
            if not modifier:
                # A prefix location without the slash also takes every slug
                # that starts with the same letters.
                assert path.endswith("/"), f"{conf}: location {path} takes /{first}-…"
        for regex in re.findall(r"^\s*location\s+~\*?\s+(\S+)\s*\{", server, re.MULTILINE):
            for segment in _REGEX_SEGMENTS.findall(regex):
                assert segment in RESERVED_SLUGS, f"{conf}: location ~ {regex}"


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
