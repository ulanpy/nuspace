"""drop notifications

The only code that inserted into this table was `notification.utils.send`, and
its last caller was deleted in `e806a19` — "sgotinish: rewrite as Telegram-first
anonymous appeals", which moved ticket notices into the bot and took the web
dashboard with it. Nothing calls `send` now, so nothing has written a row since.
`GET /notification` is the only reader and no frontend calls it.

Every URL the column ever held was
`{PUBLIC_WEBHOOK_URL}/sgotinish/{sg,student}/ticket/?id=N`, which resolves to the
apex in production. Both of those routes are already gone from the frontend — the
only sgotinish route that survives is `/sgotinish` itself — and people are
reached through `otinish_bridge`, which calls `bot.send_message` directly: no
row, no button, no URL. There is nothing here for 2.0 to carry or migrate, and
no value to backfill onto a host.

Revision ID: c4b5d6e7f8a9
Revises: b3a4c5d6e7f8
Create Date: 2026-10-14 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4b5d6e7f8a9"
down_revision: Union[str, Sequence[str], None] = "b3a4c5d6e7f8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("notifications")


def downgrade() -> None:
    # Shape only. The rows are gone for good: there were no writers after
    # `e806a19`, so nothing left to restore and no way to rebuild a URL column
    # that means anything.
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("notification_source", sa.String(), nullable=False),
        sa.Column("receiver_sub", sa.String(), nullable=False),
        sa.Column("type", sa.String(), nullable=False),
        sa.Column("tg_id", sa.BigInteger(), nullable=False),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["receiver_sub"], ["users.sub"]),
        sa.PrimaryKeyConstraint("id"),
    )