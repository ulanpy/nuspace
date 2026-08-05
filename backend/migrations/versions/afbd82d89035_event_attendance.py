"""event attendance

Revision ID: afbd82d89035
Revises: 0da5c3c1dd0a
Create Date: 2026-08-04 10:44:06.209544

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "afbd82d89035"
down_revision: Union[str, Sequence[str], None] = "0da5c3c1dd0a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "event_attendees",
        sa.Column("event_id", sa.BigInteger(), nullable=False),
        sa.Column("user_sub", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_sub"], ["users.sub"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("event_id", "user_sub"),
    )
    op.create_index(
        op.f("ix_event_attendees_event_id"), "event_attendees", ["event_id"], unique=False
    )
    op.create_index(
        op.f("ix_event_attendees_user_sub"), "event_attendees", ["user_sub"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_event_attendees_user_sub"), table_name="event_attendees")
    op.drop_index(op.f("ix_event_attendees_event_id"), table_name="event_attendees")
    op.drop_table("event_attendees")
