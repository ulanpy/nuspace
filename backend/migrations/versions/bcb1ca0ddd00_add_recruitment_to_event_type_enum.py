"""add recruitment to event_type enum

Revision ID: bcb1ca0ddd00
Revises: 18da0a04711e
Create Date: 2025-08-15 12:06:04.604280

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "bcb1ca0ddd00"
down_revision: Union[str, Sequence[str], None] = "18da0a04711e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add recruitment to event_type enum
    op.execute("ALTER TYPE event_type ADD VALUE 'recruitment'")


def downgrade() -> None:
    """Downgrade schema."""
    # Note: PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # For now, we'll leave the recruitment value in place during downgrade
    pass
