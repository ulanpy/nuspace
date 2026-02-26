"""add departments is_special

Revision ID: 8f4c32e1215d
Revises: 84822b5a285d
Create Date: 2026-02-26 06:09:39.163138

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f4c32e1215d'
down_revision: Union[str, Sequence[str], None] = '84822b5a285d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'departments',
        sa.Column('is_special', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.execute(
        """
        UPDATE departments
        SET is_special = TRUE
        WHERE id IN (10, 11)
        """
    )
    op.alter_column('departments', 'is_special', server_default=None)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('departments', 'is_special')
