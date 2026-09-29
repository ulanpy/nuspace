"""repoint media from `communities` to `pages`

**The `ALTER TYPE entity_type ADD VALUE 'pages'` is in f1e2d3c4b5a6, not here,
and must not be moved back.** Postgres cannot read a value added by ADD VALUE
inside the same transaction, and Alembic runs a revision in one. Merge the two
files and it builds fine, passes `alembic upgrade` against an empty database,
and then fails at runtime the first time it meets a `media` row — not at build
time, not in the diff, in production.

Revision ID: a2f3e4d5c6b7
Revises: f1e2d3c4b5a6
Create Date: 2026-09-29 16:05:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a2f3e4d5c6b7"
down_revision: Union[str, Sequence[str], None] = "f1e2d3c4b5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safe here only because the value was added and committed a revision ago.
    op.execute("UPDATE media SET entity_type='pages' WHERE entity_type='communities'")


def downgrade() -> None:
    # PG has no DROP VALUE, so `pages` stays in the enum as an inert member and
    # the rows go back to `communities`, whose value is still there too.
    op.execute("UPDATE media SET entity_type='communities' WHERE entity_type='pages'")
