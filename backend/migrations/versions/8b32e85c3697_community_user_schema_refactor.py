"""community_user_schema_refactor

Revision ID: 8b32e85c3697
Revises: 7e8f9a0b1c2d
Create Date: 2026-09-03 11:52:57.210812

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "8b32e85c3697"
down_revision: Union[str, Sequence[str], None] = "7e8f9a0b1c2d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. validate_slug(slug) -> BOOLEAN (permanent)
    op.execute("""
        CREATE OR REPLACE FUNCTION validate_slug(slug TEXT)
        RETURNS BOOLEAN AS $$
        DECLARE
            reserved TEXT[];
            word TEXT;
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
            reserved := ARRAY[
                'edit', 'admin', 'new', 'create', 'api', 'settings',
                'about', 'terms-of-service', 'privacy-policy',
                'communities', 'users', 'events', 'courses',
                'announcements', 'contacts', 'opportunities', 'profile', 'sgotinish'
            ];
            FOREACH word IN ARRAY reserved
            LOOP
                IF slug = word THEN
                    RETURN false;
                END IF;
            END LOOP;
            RETURN true;
        END;
        $$ LANGUAGE plpgsql;
        """)

    # 2. generate_unique_slug(input_text TEXT, target_table TEXT) -> TEXT (temporary)
    op.execute("""
        CREATE OR REPLACE FUNCTION generate_unique_slug(input_text TEXT, target_table TEXT)
        RETURNS TEXT AS $$
        DECLARE
            slug TEXT;
            suffix INT := 0;
            reserved TEXT[];
            word TEXT;
            candidate TEXT;
            taken BOOLEAN;
        BEGIN
            slug := lower(
                regexp_replace(
                    regexp_replace(input_text, '[^a-zA-Z0-9]+', '-', 'g'),
                    '^-+|-+$', '', 'g'
                )
            );
            slug := substring(slug from 1 for 50);
            slug := rtrim(slug, '-');
            IF length(slug) < 3 THEN
                slug := slug || '-page';
                slug := substring(slug from 1 for 50);
                slug := rtrim(slug, '-');
            END IF;

            reserved := ARRAY[
                'edit', 'admin', 'new', 'create', 'api', 'settings',
                'about', 'terms-of-service', 'privacy-policy',
                'communities', 'users', 'events', 'courses',
                'announcements', 'contacts', 'opportunities', 'profile', 'sgotinish'
            ];

            LOOP
                candidate := slug;
                IF suffix > 0 THEN
                    candidate := substring(slug from 1 for 50 - length(suffix::text)) || '-' || suffix;
                END IF;

                taken := false;
                FOREACH word IN ARRAY reserved
                LOOP
                    IF candidate = word THEN
                        taken := true;
                        EXIT;
                    END IF;
                END LOOP;

                IF NOT taken THEN
                    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE slug = %L)', target_table, candidate) INTO taken;
                END IF;

                IF NOT taken THEN
                    RETURN candidate;
                END IF;

                suffix := suffix + 1;
            END LOOP;
        END;
        $$ LANGUAGE plpgsql;
        """)

    # 3. communities: rename head -> owner
    op.alter_column("communities", "head", new_column_name="owner")

    # 4. communities: drop index + rename FK
    op.drop_index("ix_communities_head", table_name="communities")
    op.drop_constraint("communities_head_fkey", "communities", type_="foreignkey")
    op.create_foreign_key(
        "communities_owner_fkey",
        "communities",
        "users",
        ["owner"],
        ["sub"],
        ondelete="SET NULL",
    )
    op.create_index("ix_communities_owner", "communities", ["owner"], unique=False)

    # 5. communities: drop columns in order
    op.drop_column("communities", "description")
    op.drop_index("ix_communities_established", table_name="communities")
    op.drop_column("communities", "established")
    op.drop_column("communities", "telegram_url")
    op.drop_column("communities", "instagram_url")

    # 6. communities: add slug
    op.add_column("communities", sa.Column("slug", sa.Text(), nullable=True))
    op.execute("UPDATE communities SET slug = generate_unique_slug(name, 'communities')")
    op.alter_column("communities", "slug", existing_type=sa.Text(), nullable=False)
    op.create_unique_constraint("uq_communities_slug", "communities", ["slug"])
    op.create_check_constraint("chk_communities_slug", "communities", "validate_slug(slug)")

    # 7. communities: add page_content
    op.add_column(
        "communities",
        sa.Column(
            "page_content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.alter_column("communities", "page_content", server_default=None)

    # 8. users: add slug
    op.add_column("users", sa.Column("slug", sa.Text(), nullable=True))
    op.execute("UPDATE users SET slug = generate_unique_slug(name || ' ' || surname, 'users')")
    op.alter_column("users", "slug", existing_type=sa.Text(), nullable=False)
    op.create_unique_constraint("uq_users_slug", "users", ["slug"])
    op.create_check_constraint("chk_users_slug", "users", "validate_slug(slug)")

    # 9. users: add page_content
    op.add_column(
        "users",
        sa.Column(
            "page_content",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )
    op.alter_column("users", "page_content", server_default=None)

    # 10. users: add is_page_public
    op.add_column(
        "users",
        sa.Column("is_page_public", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("users", "is_page_public", server_default=None)

    # 11. Drop temporary function
    op.execute("DROP FUNCTION generate_unique_slug")


def downgrade() -> None:
    """Downgrade schema."""

    # users: drop new columns + constraints
    op.drop_constraint("chk_users_slug", "users", type_="check")
    op.drop_constraint("uq_users_slug", "users", type_="unique")
    op.drop_column("users", "is_page_public")
    op.drop_column("users", "page_content")
    op.drop_column("users", "slug")

    # communities: drop new columns + constraints
    op.drop_constraint("chk_communities_slug", "communities", type_="check")
    op.drop_constraint("uq_communities_slug", "communities", type_="unique")
    op.drop_column("communities", "page_content")
    op.drop_column("communities", "slug")

    # communities: re-add dropped columns with original types.
    # Handle any surviving rows by backfilling the NOT NULL columns through a
    # temporary server default, then dropping that default (matching the repo's
    # "add with server_default, backfill, drop default" pattern for NOT NULL).
    op.add_column("communities", sa.Column("instagram_url", sa.String(), nullable=True))
    op.add_column("communities", sa.Column("telegram_url", sa.String(), nullable=True))
    op.add_column(
        "communities",
        sa.Column(
            "established", sa.Date(), nullable=False, server_default=sa.text("'1970-01-01'::date")
        ),
    )
    op.create_index("ix_communities_established", "communities", ["established"], unique=False)
    op.alter_column("communities", "established", server_default=None)
    op.add_column(
        "communities",
        sa.Column("description", sa.String(), nullable=False, server_default=""),
    )
    op.alter_column("communities", "description", server_default=None)

    # communities: rename owner back to head, restore FK + index
    op.drop_index("ix_communities_owner", table_name="communities")
    op.drop_constraint("communities_owner_fkey", "communities", type_="foreignkey")
    op.alter_column("communities", "owner", new_column_name="head")
    op.create_foreign_key(
        "communities_head_fkey",
        "communities",
        "users",
        ["head"],
        ["sub"],
        ondelete="SET NULL",
    )
    op.create_index("ix_communities_head", "communities", ["head"], unique=False)

    # Drop both PG functions
    op.execute("DROP FUNCTION IF EXISTS validate_slug")
