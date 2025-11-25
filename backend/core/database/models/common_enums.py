from enum import Enum as PyEnum


class EntityType(str, PyEnum):
    """Enum representing different types of entities(db tables names)
    Add new table names here to extend

    ⚠️  IMPORTANT: When adding new values to this enum:
    1. Add the new value to this Python enum class
    2. Create a new Alembic migration manually (alembic revision -m "add_new_entity_type")
    3. In the migration's upgrade() function, add: op.execute("ALTER TYPE entity_type ADD VALUE 'your_new_value'")
    4. Run the migration: alembic upgrade head

    Alembic cannot auto-detect enum value changes, so manual migration is required!
    """

    community_events = "community_events"
    communities = "communities"
    grade_reports = "grade_reports"
    courses = "courses"
    tickets = "tickets"
    messages = "messages"


class NotificationType(str, PyEnum):
    """Enum representing different types of notifications
    Add new values here to extend

    ⚠️  IMPORTANT: When adding new values to this enum:
    1. Add the new value to this Python enum class
    2. Create a new Alembic migration manually (alembic revision -m "add_new_notification_type")
    3. In the migration's upgrade() function, add: op.execute("ALTER TYPE notification_type ADD VALUE 'your_new_value'")
    4. Run the migration: alembic upgrade head

    Alembic cannot auto-detect enum value changes, so manual migration is required!
    """

    info = "info"
