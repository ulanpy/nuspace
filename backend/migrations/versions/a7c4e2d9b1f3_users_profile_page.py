"""users carry a profile page

A profile page is three columns on `users`, not a table of its own (#416, #434),
so deleting the account deletes the profile with it:

- `handle`: nullable and unique. The profile page exists only once it is set.
  Validated in the app (`modules/profiles/handle.py`): the slug rules plus the
  account host's reserved words.
- `profile_visibility`: the Page enum, `private` until the person chooses
  otherwise. Existing rows take the default too.
- `profile_content`: the Puck document the person wrote. Null until they first
  save one; the editor then opens on the About and Links template.

Revision ID: a7c4e2d9b1f3
Revises: d5c6e7f8a9b0
Create Date: 2026-10-28 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a7c4e2d9b1f3"
down_revision: Union[str, Sequence[str], None] = "d5c6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# The type exists already: `pages.visibility` created it.
PAGE_VISIBILITY = postgresql.ENUM(
    "private", "internal", "public", name="page_visibility", create_type=False
)


def upgrade() -> None:
    op.add_column("users", sa.Column("handle", sa.Text(), nullable=True))
    op.create_index("ix_users_handle", "users", ["handle"], unique=True)
    op.add_column(
        "users",
        sa.Column(
            "profile_visibility",
            PAGE_VISIBILITY,
            nullable=False,
            server_default="private",
        ),
    )
    op.add_column(
        "users",
        sa.Column("profile_content", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "profile_content")
    op.drop_column("users", "profile_visibility")
    op.drop_index("ix_users_handle", table_name="users")
    op.drop_column("users", "handle")
