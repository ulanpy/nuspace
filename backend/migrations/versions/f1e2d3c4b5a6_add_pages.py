"""pages: the merged communities + profile-page entity

Creates `pages`, `page_admins` and `page_admin_links`, then copies every
community row across. The copy runs in Python rather than in SQL because the
slug has to be re-derived from the name under the same rules the application
uses (`base_slug`), with a uniqueness suffix and a `page-{id}` fallback — a
SQL expression cannot ask "is this candidate a reserved word" without
reimplementing `validate_slug`, and reimplementing it is how the two copies
diverge.

Revision ID: f1e2d3c4b5a6
Revises: e5f6a7b8c9d0
Create Date: 2026-09-29 16:00:00.000000

"""

import json
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from backend.modules.shared.slug import RESERVED_SLUGS, SLUG_RE, base_slug

# revision identifiers, used by Alembic.
revision: str = "f1e2d3c4b5a6"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _usable(candidate: str) -> bool:
    """Whether a candidate can be written to `pages.slug` at all.

    `base_slug` can return something the column's CHECK constraint rejects —
    `base_slug("🎉")` is `-page`, and a leading hyphen does not match
    SLUG_RE — so "is it empty" is the wrong test, "does it validate" is the
    right one. Length and reserved words come along for free.
    """
    return (
        bool(SLUG_RE.match(candidate))
        and 3 <= len(candidate) <= 50
        and candidate not in (RESERVED_SLUGS)
    )


def _unique_slug(name: str, page_id: int, taken: set[str]) -> str:
    base = base_slug(name)
    candidate = base
    suffix = 2
    while candidate in taken or not _usable(candidate):
        if not _usable(candidate):
            # A name that slugifies to nothing usable (`🎉`, `---`) gets the id
            # instead: unique by construction, and readable in a URL.
            candidate = f"page-{page_id}"
            break
        candidate = f"{base[: 50 - len(str(suffix))]}-{suffix}"
        suffix += 1
    return candidate


def upgrade() -> None:
    # `ALTER TYPE ... ADD VALUE` lives here, one revision before the UPDATE that
    # uses it, and MUST NOT move back down into a2f3e4d5c6b7. Postgres cannot
    # read a value added by ADD VALUE inside the same transaction, and Alembic
    # runs a revision in one: put both statements in one file and it builds,
    # upgrades cleanly against an empty database, and then fails in production
    # on the first `media` row it meets. Do not merge them.
    op.execute("ALTER TYPE entity_type ADD VALUE IF NOT EXISTS 'pages'")

    op.create_table(
        "pages",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column(
            "visibility",
            sa.Enum("private", "internal", "public", name="page_visibility"),
            nullable=False,
            server_default="public",
        ),
        sa.Column("owner", sa.String(), nullable=True),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column("page_content", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["owner"], ["users.sub"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_pages_created_at"), "pages", ["created_at"], unique=False)
    op.create_index(op.f("ix_pages_name"), "pages", ["name"], unique=False)
    op.create_index(op.f("ix_pages_owner"), "pages", ["owner"], unique=False)
    op.create_index(op.f("ix_pages_visibility"), "pages", ["visibility"], unique=False)
    # The CHECK moves with the column: `communities` had one, and it is the
    # backstop under the pydantic validator.
    op.create_check_constraint("chk_pages_slug", "pages", "validate_slug(slug)")

    op.create_table(
        "page_admins",
        sa.Column("page_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("page_id", "user_sub"),
    )
    op.create_index(op.f("ix_page_admins_page_id"), "page_admins", ["page_id"], unique=False)
    op.create_index(op.f("ix_page_admins_user_sub"), "page_admins", ["user_sub"], unique=False)

    op.create_table(
        "page_admin_links",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("page_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_page_admin_links_page_id"), "page_admin_links", ["page_id"], unique=False
    )
    op.create_index(
        op.f("ix_page_admin_links_created_by_sub"),
        "page_admin_links",
        ["created_by_sub"],
        unique=False,
    )
    op.create_index(
        op.f("ix_page_admin_links_token_hash"), "page_admin_links", ["token_hash"], unique=False
    )
    # At most one unrevoked link per page. The old table had it; it is a
    # correctness constraint, not an optimisation, so it comes across.
    op.create_index(
        "uq_page_admin_links_active",
        "page_admin_links",
        ["page_id"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            "SELECT id, name, owner, page_content, created_at, updated_at "
            "FROM communities ORDER BY id"
        )
    ).mappings()

    taken: set[str] = set()
    for row in rows:
        slug = _unique_slug(row["name"], row["id"], taken)
        taken.add(slug)
        connection.execute(
            sa.text(
                "INSERT INTO pages "
                "(id, name, description, visibility, owner, slug, page_content, "
                " created_at, updated_at) "
                "VALUES (:id, :name, NULL, 'public', :owner, :slug, "
                "        CAST(:page_content AS jsonb), :created_at, :updated_at)"
            ),
            {
                "id": row["id"],
                "name": row["name"],
                "owner": row["owner"],
                "slug": slug,
                "page_content": json.dumps(row["page_content"] or {}),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            },
        )

    # Ids line up with `communities.id`, so these are plain inserts. `page_content`
    # keeps a NULL out of the picture: the column is NOT NULL and the old one was.
    connection.execute(
        sa.text(
            "INSERT INTO page_admins (page_id, user_sub, created_at) "
            "SELECT community_id, user_sub, created_at FROM community_admins"
        )
    )
    connection.execute(
        sa.text(
            "INSERT INTO page_admin_links "
            "(id, page_id, token_hash, created_by_sub, created_at, revoked_at) "
            "SELECT id, community_id, token_hash, created_by_sub, created_at, revoked_at "
            "FROM community_admin_links"
        )
    )
    # The old sequences are still bound to `communities_id_seq` etc. and will be
    # dropped with the tables in b3a4c5d6e7f8; point the new one at the copied
    # max now so a row inserted between this migration and that one cannot
    # collide. `setval(..., NULL)` is an error, and an empty table is legal.
    if taken:
        connection.execute(
            sa.text("SELECT setval('pages_id_seq', (SELECT max(id) FROM pages), true)")
        )


def downgrade() -> None:
    op.drop_index("uq_page_admin_links_active", table_name="page_admin_links")
    op.drop_index(op.f("ix_page_admin_links_token_hash"), table_name="page_admin_links")
    op.drop_index(op.f("ix_page_admin_links_created_by_sub"), table_name="page_admin_links")
    op.drop_index(op.f("ix_page_admin_links_page_id"), table_name="page_admin_links")
    op.drop_table("page_admin_links")

    op.drop_index(op.f("ix_page_admins_user_sub"), table_name="page_admins")
    op.drop_index(op.f("ix_page_admins_page_id"), table_name="page_admins")
    op.drop_table("page_admins")

    op.drop_constraint("chk_pages_slug", "pages", type_="check")
    op.drop_index(op.f("ix_pages_visibility"), table_name="pages")
    op.drop_index(op.f("ix_pages_owner"), table_name="pages")
    op.drop_index(op.f("ix_pages_name"), table_name="pages")
    op.drop_index(op.f("ix_pages_created_at"), table_name="pages")
    op.drop_table("pages")
    op.execute("DROP TYPE page_visibility")
    # PG has no DROP VALUE, so `pages` stays in `entity_type` as an inert
    # member. Deferred to the enum cleanup.
