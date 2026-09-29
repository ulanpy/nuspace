"""drop communities, the profile-page columns, and `users.id`

Last of the three `pages` migrations. The copy has already happened and the
media rows already point at `pages`, so this only removes what nothing reads
any more.

`users.id` goes with the rest: it existed only so `media.entity_id` could hang
a `users` int off `entity_type='users'`. `slug` and `category` are only
unreachable once the people directory and `/u/$slug` are gone, which is the
same commit.

Revision ID: b3a4c5d6e7f8
Revises: a2f3e4d5c6b7
Create Date: 2026-09-29 16:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b3a4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "a2f3e4d5c6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_DROPPED_USER_COLUMNS = ("page_content", "is_page_public", "slug", "category", "id")


def upgrade() -> None:
    op.drop_index("uq_community_admin_links_active", table_name="community_admin_links")
    op.drop_table("community_admin_links")
    op.drop_table("community_admins")

    # `EventCollaborator` has no service, repository or endpoint. The FK is the
    # only thing tying events to the communities table.
    op.drop_constraint(
        "event_collaborators_community_id_fkey", "event_collaborators", type_="foreignkey"
    )
    op.drop_column("event_collaborators", "community_id")

    op.drop_table("communities")

    # `entity_type='users'` rows address `users.id`, which is about to go. Left
    # alone they are unreadable rows pointing at a column that no longer exists,
    # so they go with it.
    op.execute("DELETE FROM media WHERE entity_type='users'")

    for column in _DROPPED_USER_COLUMNS:
        op.drop_column("users", column)
    # The only consumer of `usercategory` was the column dropped just above.
    op.execute("DROP TYPE IF EXISTS usercategory")


def downgrade() -> None:
    # Not restored: the `entity_type='users'` media rows deleted on the way up.
    # They are user profile pictures keyed by a surrogate id that no longer has a
    # source to be rebuilt from, and a downgrade that cannot resurrect data is
    # the documented cost of dropping it. `community_type` / `community_category`
    # are recreated as constants above for the same reason: the copies were made
    # up, and pretending otherwise would be a lie in the schema.
    op.execute("CREATE TYPE usercategory AS ENUM ('student', 'faculty', 'staff')")
    op.add_column(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
    )
    op.add_column("users", sa.Column("category", sa.Enum(name="usercategory"), nullable=True))
    op.add_column("users", sa.Column("slug", sa.Text(), nullable=True))
    op.add_column(
        "users", sa.Column("is_page_public", sa.Boolean(), nullable=False, server_default="false")
    )
    op.add_column(
        "users",
        sa.Column(
            "page_content",
            sa.dialects.postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.execute("UPDATE users SET category = 'student' WHERE category IS NULL")
    # `generate_unique_slug()` is gone from the database, so the slugs are
    # rebuilt from `sub` — unique, never null, and the same thing the old
    # `users.id` column was for. The length and reserved-word guards are what
    # `chk_users_slug` would otherwise reject.
    op.execute("""
        UPDATE users
        SET slug = CASE
            WHEN length(candidate) < 3 OR candidate IN (
                'edit', 'admin', 'new', 'create', 'api', 'settings', 'about',
                'terms-of-service', 'privacy-policy', 'pages', 'users', 'events',
                'courses', 'announcements', 'contacts', 'opportunities', 'profile',
                'sgotinish', 'p'
            ) THEN 'user-' || left(candidate, 45)
            ELSE candidate
        END
        FROM (
            SELECT sub,
                   rtrim(left(lower(regexp_replace(sub, '[^a-z0-9]+', '-', 'g')), 50), '-')
                       AS candidate
            FROM users
        ) t
        WHERE users.sub = t.sub
        """)
    op.alter_column("users", "category", existing_type=sa.Enum(name="usercategory"), nullable=False)
    op.alter_column("users", "slug", existing_type=sa.Text(), nullable=False)
    op.create_unique_constraint("uq_users_slug", "users", ["slug"])
    op.create_check_constraint("chk_users_slug", "users", "validate_slug(slug)")
    op.create_index(op.f("ix_users_category"), "users", ["category"], unique=False)

    op.create_table(
        "communities",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "type",
            postgresql.ENUM(
                "club", "university", "organization", name="community_type", create_type=False
            ),
            nullable=False,
        ),
        sa.Column(
            "category",
            postgresql.ENUM(
                "academic",
                "professional",
                "recreational",
                "cultural",
                "sports",
                "social",
                "art",
                name="community_category",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("owner", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False),
        sa.Column(
            "page_content",
            sa.dialects.postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.ForeignKeyConstraint(["owner"], ["users.sub"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_communities_category"), "communities", ["category"], unique=False)
    op.create_index(op.f("ix_communities_created_at"), "communities", ["created_at"], unique=False)
    op.create_index(op.f("ix_communities_name"), "communities", ["name"], unique=False)
    op.create_index(op.f("ix_communities_owner"), "communities", ["owner"], unique=False)
    op.create_index(op.f("ix_communities_type"), "communities", ["type"], unique=False)
    op.create_index(op.f("ix_communities_verified"), "communities", ["verified"], unique=False)
    op.create_check_constraint("chk_communities_slug", "communities", "validate_slug(slug)")

    op.create_table(
        "community_admins",
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("community_id", "user_sub"),
    )
    op.create_index(op.f("ix_community_admins_community_id"), "community_admins", ["community_id"])
    op.create_index(op.f("ix_community_admins_user_sub"), "community_admins", ["user_sub"])

    op.create_table(
        "community_admin_links",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_community_admin_links_community_id"),
        "community_admin_links",
        ["community_id"],
    )
    op.create_index(
        op.f("ix_community_admin_links_created_by_sub"),
        "community_admin_links",
        ["created_by_sub"],
    )
    op.create_index(
        op.f("ix_community_admin_links_token_hash"),
        "community_admin_links",
        ["token_hash"],
    )
    op.create_index(
        "uq_community_admin_links_active",
        "community_admin_links",
        ["community_id"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )

    op.add_column("event_collaborators", sa.Column("community_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "event_collaborators_community_id_fkey",
        "event_collaborators",
        "communities",
        ["community_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        op.f("ix_event_collaborators_community_id"),
        "event_collaborators",
        ["community_id"],
        unique=False,
    )

    # Put the rows back. `communities` is empty, so the copied pages are what
    # restores it: the community-only columns are gone for good, which is what a
    # downgrade of a destructive migration is allowed to lose.
    op.execute(
        "INSERT INTO communities "
        "(id, name, type, category, email, verified, owner, created_at, updated_at, "
        " slug, page_content) "
        "SELECT id, name, 'organization', 'social', NULL, false, owner, created_at, "
        "       updated_at, slug, page_content FROM pages"
    )
    op.execute(
        "INSERT INTO community_admins (community_id, user_sub, created_at) "
        "SELECT page_id, user_sub, created_at FROM page_admins"
    )
    op.execute(
        "INSERT INTO community_admin_links "
        "(id, community_id, token_hash, created_by_sub, created_at, revoked_at) "
        "SELECT id, page_id, token_hash, created_by_sub, created_at, revoked_at "
        "FROM page_admin_links"
    )
