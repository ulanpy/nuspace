"""pages carry the text inside their blocks

The editor walks the Puck document at save time and sends the text it found (#416,
#439). It is stored here so search can index it without parsing `page_content`.

Revision ID: c4a9d2e6f1b8
Revises: b3f8a1c5d7e2
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4a9d2e6f1b8"
down_revision: Union[str, Sequence[str], None] = "b3f8a1c5d7e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "pages", sa.Column("content_text", sa.Text(), nullable=False, server_default="")
    )


def downgrade() -> None:
    op.drop_column("pages", "content_text")
