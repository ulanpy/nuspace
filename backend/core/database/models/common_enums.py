from enum import Enum as PyEnum


class EntityType(str, PyEnum):
    """Enum representing different types of entities(db tables names)
    Add new table names here to extend"""

    products = "products"
    community_events = "community_events"
    communities = "communities"
    community_posts = "community_posts"
    reviews = "reviews"
    community_comments = "community_comments"
    grade_reports = "grade_reports"


class NotificationType(str, PyEnum):
    info = "info"
