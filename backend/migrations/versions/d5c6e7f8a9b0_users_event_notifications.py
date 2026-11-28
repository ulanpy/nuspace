"""users.event_notifications

Whether a person hears on Telegram when an event they attend is cancelled or
moved. On for everyone by default; reaching them also needs `telegram_id`.

Revision ID: d5c6e7f8a9b0
Revises: c4b5d6e7f8a9
Create Date: 2026-10-28 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d5c6e7f8a9b0"
down_revision: Union[str, Sequence[str], None] = "c4b5d6e7f8a9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("event_notifications", sa.Boolean(), server_default=sa.true(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "event_notifications")
