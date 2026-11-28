"""users carry a custom profile picture and banner

Object references into the bucket (#416, #435). They sit on `users` because
`media.entity_id` is a bigint and cannot hold a Keycloak `sub`, so no `media`
row represents them. Null means no custom picture: the sign-in avatar (`picture`)
shows instead.

Revision ID: b3f8a1c5d7e2
Revises: 6535213ea0e6
Create Date: 2026-11-16 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3f8a1c5d7e2"
down_revision: Union[str, Sequence[str], None] = "6535213ea0e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("profile_banner", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "profile_banner")
    op.drop_column("users", "profile_picture")
