"""add_end_datetime_to_events_table

Revision ID: de873a88b9db
Revises: bcb1ca0ddd00
Create Date: 2025-08-15 13:19:18.237708

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "de873a88b9db"
down_revision: Union[str, Sequence[str], None] = "bcb1ca0ddd00"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Step 1: Add end_datetime column
    op.add_column("events", sa.Column("end_datetime", sa.DateTime(), nullable=True))

    # Step 2: Populate end_datetime based on event_datetime + duration
    # This calculates end_datetime = event_datetime + (duration * interval '1 minute')
    op.execute(
        """
        UPDATE events 
        SET end_datetime = event_datetime + (duration * interval '1 minute')
        WHERE duration IS NOT NULL AND duration > 0
    """
    )

    # Step 3: For events with null duration, set end_datetime to event_datetime + 1 hour (default)
    op.execute(
        """
        UPDATE events 
        SET end_datetime = event_datetime + interval '1 hour'
        WHERE duration IS NULL OR duration = 0
    """
    )

    # Step 4: Make end_datetime NOT NULL after populating all values
    op.alter_column("events", "end_datetime", nullable=False)

    # Step 5: Rename event_datetime to start_datetime
    op.alter_column("events", "event_datetime", new_column_name="start_datetime")

    # Step 6: Drop the duration column as it's no longer needed
    op.drop_column("events", "duration")


def downgrade() -> None:
    """Downgrade schema."""
    # Step 1: Add duration column back
    op.add_column("events", sa.Column("duration", sa.Integer(), nullable=True))

    # Step 2: Calculate duration from start_datetime and end_datetime
    op.execute(
        """
        UPDATE events 
        SET duration = EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 60
        WHERE end_datetime IS NOT NULL AND start_datetime IS NOT NULL
    """
    )

    # Step 3: Set default duration for events where calculation failed
    op.execute(
        """
        UPDATE events 
        SET duration = 60
        WHERE duration IS NULL OR duration <= 0
    """
    )

    # Step 4: Make duration NOT NULL after populating all values
    op.alter_column("events", "duration", nullable=False)

    # Step 5: Rename start_datetime back to event_datetime
    op.alter_column("events", "start_datetime", new_column_name="event_datetime")

    # Step 6: Drop the end_datetime column
    op.drop_column("events", "end_datetime")
