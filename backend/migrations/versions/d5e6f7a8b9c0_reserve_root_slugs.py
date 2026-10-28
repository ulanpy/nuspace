"""pages: reserve the paths nginx answers itself on pages.nuspace.kz

A Page now lives at `pages.nuspace.kz/<slug>`, at the host's root, so a slug may
not be a path nginx serves before the router: `/api`, `/ws/`, `/assets/` and the
files the build writes at its root (#431). `validate_slug()`, which the
`chk_pages_slug` constraint calls, is redefined over the same set as
`backend.modules.shared.slug.RESERVED_SLUGS`. Its list had already drifted from
the app's (it still held `communities` and lacked `pages`); this brings it back,
and `tests/test_reserved_slugs.py` keeps it there.

The list is written out rather than imported: a migration is a record of what
the database held at this revision, and the app's set will keep changing.

A Page already holding a slug that is now reserved could never be reached at its
address, and any later write to its row would trip the constraint, so it is
moved to `page-<id>`, as the pages migration does for a name with no usable
slug. No redirect is left behind.

Revision ID: d5e6f7a8b9c0
Revises: c4b5d6e7f8a9
Create Date: 2026-10-28 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5e6f7a8b9c0"
down_revision: Union[str, Sequence[str], None] = "c4b5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RESERVED = (
    # Words.
    "edit",
    "admin",
    "new",
    "create",
    "settings",
    "about",
    "terms-of-service",
    "privacy-policy",
    "pages",
    "users",
    "events",
    "courses",
    "announcements",
    "contacts",
    "opportunities",
    "profile",
    "sgotinish",
    # Paths nginx answers itself.
    "api",
    "ws",
    "assets",
    "favicon.ico",
    "index.html",
    "404.html",
    "_hosts",
    # The build root, from web/public.
    "data",
    "favicon.svg",
)

PREVIOUS = (
    "edit",
    "admin",
    "new",
    "create",
    "api",
    "settings",
    "about",
    "terms-of-service",
    "privacy-policy",
    "communities",
    "users",
    "events",
    "courses",
    "announcements",
    "contacts",
    "opportunities",
    "profile",
    "sgotinish",
)


def _validate_slug(reserved: tuple[str, ...]) -> str:
    words = ", ".join(f"'{word}'" for word in reserved)
    return f"""
        CREATE OR REPLACE FUNCTION validate_slug(slug TEXT)
        RETURNS BOOLEAN AS $$
        BEGIN
            IF slug IS NULL THEN
                RETURN false;
            END IF;
            IF length(slug) < 3 OR length(slug) > 50 THEN
                RETURN false;
            END IF;
            IF slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
                RETURN false;
            END IF;
            RETURN NOT (slug = ANY (ARRAY[{words}]::TEXT[]));
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
        """


def upgrade() -> None:
    op.execute(_validate_slug(RESERVED))
    op.execute("UPDATE pages SET slug = 'page-' || id WHERE NOT validate_slug(slug)")


def downgrade() -> None:
    op.execute(_validate_slug(PREVIOUS))
