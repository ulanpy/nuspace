from enum import Enum


class OrderEvents(Enum):
    """
    Enum for sorting events.

    Values:
    - `created_at`: Sort by creation date (descending).
    - `event_datetime`: Sort by event date (ascending).
    """

    created_at = "created_at"
    event_datetime = "event_datetime"
