"""pages: free the slugs the deleted 1.0 root routes held

`contacts`, `sgotinish` and `announcements` were reserved only because 1.0
served screens at those root paths. 2.0 serves Contacts and Sgotinish as Pages
on `pages.nuspace.kz`, so `validate_slug()` (the `chk_pages_slug` constraint)
is redefined without them. The list is written out, as in d5e6f7a8b9c0.

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-11-24 00:00:01.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
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
    "opportunities",
    "profile",
    # Paths nginx answers itself.
    "api",
    "ws",
    "assets",
    "favicon.ico",
    "index.html",
    "404.html",
    "_hosts",
    "gcs",
    "src",
    "node_modules",
    # The build root, from web/public.
    "data",
    "favicon.svg",
)


PREVIOUS = (
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
    "gcs",
    "src",
    "node_modules",
    # The build root, from web/public.
    "data",
    "favicon.svg",
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


def downgrade() -> None:
    # Restores the old function only. A Page already holding one of these
    # slugs would then fail `chk_pages_slug` on its next write.
    op.execute(_validate_slug(PREVIOUS))
