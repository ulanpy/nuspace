from enum import Enum as PyEnum


class EntityType(PyEnum):
    """Enum representing different types of entities(db tables names)
    Add new table names here to extend"""

    products = "products"
    community_events = "community_events"
    communities = "communities"
    community_posts = "community_posts"
    reviews = "reviews"
