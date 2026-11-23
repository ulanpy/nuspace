"""search embeddings (pgvector)

One normalised 768-dimension vector per embedded search Source (#441). The scan
is exact, so there is no ANN index.

Revision ID: d7e3b9a1c5f2
Revises: c4a9d2e6f1b8
Create Date: 2026-11-23 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d7e3b9a1c5f2"
down_revision: Union[str, Sequence[str], None] = "c4a9d2e6f1b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute(
        """
        CREATE TABLE search_embeddings (
            source text NOT NULL,
            key text NOT NULL,
            content_hash text NOT NULL,
            embedding vector(768) NOT NULL,
            PRIMARY KEY (source, key)
        )
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE search_embeddings")
