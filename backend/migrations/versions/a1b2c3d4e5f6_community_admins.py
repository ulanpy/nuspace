"""community admins and admin access links

Revision ID: a1b2c3d4e5f6
Revises: 8b32e85c3697
Create Date: 2026-09-07 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "8b32e85c3697"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "community_admins",
        sa.Column("community_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("community_id", "user_sub"),
    )
    op.create_index(
        op.f("ix_community_admins_community_id"),
        "community_admins",
        ["community_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_community_admins_user_sub"),
        "community_admins",
        ["user_sub"],
        unique=False,
    )

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
        unique=False,
    )
    op.create_index(
        op.f("ix_community_admin_links_created_by_sub"),
        "community_admin_links",
        ["created_by_sub"],
        unique=False,
    )
    op.create_index(
        op.f("ix_community_admin_links_token_hash"),
        "community_admin_links",
        ["token_hash"],
        unique=False,
    )
    op.create_index(
        "uq_community_admin_links_active",
        "community_admin_links",
        ["community_id"],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_community_admin_links_active",
        table_name="community_admin_links",
    )
    op.drop_index(op.f("ix_community_admin_links_token_hash"), table_name="community_admin_links")
    op.drop_index(
        op.f("ix_community_admin_links_created_by_sub"), table_name="community_admin_links"
    )
    op.drop_index(op.f("ix_community_admin_links_community_id"), table_name="community_admin_links")
    op.drop_table("community_admin_links")

    op.drop_index(op.f("ix_community_admins_user_sub"), table_name="community_admins")
    op.drop_index(op.f("ix_community_admins_community_id"), table_name="community_admins")
    op.drop_table("community_admins")
