"""event_attendees.reminded_at

When the 24h event reminder claimed an attendee. Null until then, so the
reminder job sends each attendee one reminder and never a second.

Revision ID: a7b8c9d0e1f2
Revises: 6535213ea0e6
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "6535213ea0e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "event_attendees",
        sa.Column("reminded_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("event_attendees", "reminded_at")
