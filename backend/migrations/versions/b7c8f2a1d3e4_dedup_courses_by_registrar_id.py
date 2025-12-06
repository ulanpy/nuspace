"""dedup courses by registrar_id and add uniqueness

Revision ID: b7c8f2a1d3e4
Revises: f57d3dcb5d7b
Create Date: 2025-12-06 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "b7c8f2a1d3e4"
down_revision: Union[str, Sequence[str], None] = "f57d3dcb5d7b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Find duplicate courses that share the same registrar_id.
    dup_rows = conn.execute(
        text(
            """
            SELECT registrar_id, array_agg(id ORDER BY id) AS ids
            FROM courses
            WHERE registrar_id IS NOT NULL
            GROUP BY registrar_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()

    for registrar_id, ids in dup_rows:
        canonical_id = ids[0]
        duplicate_ids = ids[1:]
        if not duplicate_ids:
            continue

        # Repoint foreign keys in referencing tables.
        conn.execute(
            text(
                """
                UPDATE student_courses
                SET course_id = :canonical_id
                WHERE course_id = ANY(:duplicate_ids)
                """
            ),
            {"canonical_id": canonical_id, "duplicate_ids": duplicate_ids},
        )
        conn.execute(
            text(
                """
                UPDATE course_templates
                SET course_id = :canonical_id
                WHERE course_id = ANY(:duplicate_ids)
                """
            ),
            {"canonical_id": canonical_id, "duplicate_ids": duplicate_ids},
        )

        # Drop duplicate course rows.
        conn.execute(
            text(
                "DELETE FROM courses WHERE id = ANY(:duplicate_ids)"
            ),
            {"duplicate_ids": duplicate_ids},
        )

    # Enforce uniqueness going forward.
    op.create_unique_constraint(
        "uq_courses_registrar_id", "courses", ["registrar_id"]
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_courses_registrar_id", "courses", type_="unique"
    )

