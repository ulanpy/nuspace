"""add_sg_assignment_tracking

Revision ID: 84822b5a285d
Revises: ec352e8c5988
Create Date: 2026-02-24 16:52:59.632119

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '84822b5a285d'
down_revision: Union[str, Sequence[str], None] = 'ec352e8c5988'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('sg_assigned_at', sa.DateTime(), nullable=True))
    op.add_column('users', sa.Column('sg_assigned_by_sub', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_sg_assigned_at'), 'users', ['sg_assigned_at'], unique=False)
    op.create_index(op.f('ix_users_sg_assigned_by_sub'), 'users', ['sg_assigned_by_sub'], unique=False)
    op.create_foreign_key(
        'fk_users_sg_assigned_by_sub_users',
        'users',
        'users',
        ['sg_assigned_by_sub'],
        ['sub'],
        ondelete='SET NULL',
    )
    op.execute(
        """
        UPDATE users
        SET sg_assigned_at = created_at
        WHERE role IN ('boss', 'capo', 'soldier') AND sg_assigned_at IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_users_sg_assigned_by_sub_users', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_sg_assigned_by_sub'), table_name='users')
    op.drop_index(op.f('ix_users_sg_assigned_at'), table_name='users')
    op.drop_column('users', 'sg_assigned_by_sub')
    op.drop_column('users', 'sg_assigned_at')
