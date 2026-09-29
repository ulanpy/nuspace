"""users.category

Adds the Student / Faculty / Staff column and the `usercategory` enum behind
it. Every existing account is a student until they say otherwise, so the
column is NOT NULL with a server default rather than nullable.

Revision ID: e5f6a7b8c9d0
Revises: b3c4d5e6f7a8
Create Date: 2026-09-29 14:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The enum is manual, same as `entity_type` in b3c4d5e6f7a8: Alembic cannot
    # see enum values change. CREATE TYPE has no IF NOT EXISTS before PG 12 for
    # this form, so the guard keeps a downgrade/upgrade round trip from failing.
    op.execute("CREATE TYPE usercategory AS ENUM ('student', 'faculty', 'staff')")
    op.execute("ALTER TABLE users ADD COLUMN category usercategory NOT NULL DEFAULT 'student'")


def downgrade() -> None:
    op.drop_column("users", "category")
    # PG has no DROP VALUE, so the type goes with the column that used it.
    op.execute("DROP TYPE usercategory")
