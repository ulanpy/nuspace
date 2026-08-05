"""event access invites and attendee viewers

Revision ID: c3e8a1b4f902
Revises: afbd82d89035
Create Date: 2026-08-04 20:20:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3e8a1b4f902"
down_revision: Union[str, Sequence[str], None] = "afbd82d89035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

purpose_enum = postgresql.ENUM(
    "transfer",
    "co_view",
    name="event_access_purpose",
    create_type=False,
)


def upgrade() -> None:
    purpose_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "event_access_invites",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), nullable=False),
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("purpose", purpose_enum, nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("created_by_sub", sa.String(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_by_sub", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["accepted_by_sub"], ["users.sub"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        op.f("ix_event_access_invites_accepted_by_sub"),
        "event_access_invites",
        ["accepted_by_sub"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_access_invites_created_by_sub"),
        "event_access_invites",
        ["created_by_sub"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_access_invites_event_id"),
        "event_access_invites",
        ["event_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_access_invites_purpose"),
        "event_access_invites",
        ["purpose"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_access_invites_token_hash"),
        "event_access_invites",
        ["token_hash"],
        unique=False,
    )

    op.create_table(
        "event_attendee_viewers",
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("granted_by_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["granted_by_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id", "user_sub"),
    )
    op.create_index(
        op.f("ix_event_attendee_viewers_event_id"),
        "event_attendee_viewers",
        ["event_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_attendee_viewers_granted_by_sub"),
        "event_attendee_viewers",
        ["granted_by_sub"],
        unique=False,
    )
    op.create_index(
        op.f("ix_event_attendee_viewers_user_sub"),
        "event_attendee_viewers",
        ["user_sub"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_event_attendee_viewers_user_sub"), table_name="event_attendee_viewers")
    op.drop_index(
        op.f("ix_event_attendee_viewers_granted_by_sub"), table_name="event_attendee_viewers"
    )
    op.drop_index(op.f("ix_event_attendee_viewers_event_id"), table_name="event_attendee_viewers")
    op.drop_table("event_attendee_viewers")

    op.drop_index(op.f("ix_event_access_invites_token_hash"), table_name="event_access_invites")
    op.drop_index(op.f("ix_event_access_invites_purpose"), table_name="event_access_invites")
    op.drop_index(op.f("ix_event_access_invites_event_id"), table_name="event_access_invites")
    op.drop_index(op.f("ix_event_access_invites_created_by_sub"), table_name="event_access_invites")
    op.drop_index(
        op.f("ix_event_access_invites_accepted_by_sub"), table_name="event_access_invites"
    )
    op.drop_table("event_access_invites")
    purpose_enum.drop(op.get_bind(), checkfirst=True)
