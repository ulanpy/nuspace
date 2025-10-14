"""merge duplicate student courses

Revision ID: c8dc2ede9974
Revises: 1691549e89c9
Create Date: 2025-10-14 18:04:48.676051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8dc2ede9974'
down_revision: Union[str, Sequence[str], None] = '1691549e89c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge duplicate student_courses rows and enforce uniqueness."""
    bind = op.get_bind()

    # Reassign course_items to the kept student_course (lowest id per pair)
    bind.execute(
        sa.text(
            """
            WITH resolved AS (
                SELECT
                    id,
                    student_sub,
                    course_id,
                    MIN(id) OVER (PARTITION BY student_sub, course_id) AS keep_id
                FROM student_courses
                WHERE course_id IS NOT NULL
            ),
            to_move AS (
                SELECT id, keep_id
                FROM resolved
                WHERE id <> keep_id
            )
            UPDATE course_items AS ci
            SET student_course_id = tm.keep_id
            FROM to_move tm
            WHERE ci.student_course_id = tm.id
            """
        )
    )

    # Delete duplicate student_course rows now that items are merged
    bind.execute(
        sa.text(
            """
            WITH resolved AS (
                SELECT
                    id,
                    student_sub,
                    course_id,
                    MIN(id) OVER (PARTITION BY student_sub, course_id) AS keep_id
                FROM student_courses
                WHERE course_id IS NOT NULL
            )
            DELETE FROM student_courses sc
            USING resolved r
            WHERE sc.id = r.id
              AND r.id <> r.keep_id
            """
        )
    )

    # Add unique constraint to prevent future duplicates
    op.create_unique_constraint(
        "uq_student_courses_student_course_unique",
        "student_courses",
        ["student_sub", "course_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Intentionally left blank; data merge is irreversible.
    pass
