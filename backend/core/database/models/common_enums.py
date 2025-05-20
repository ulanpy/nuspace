from enum import Enum as PyEnum


class EntityType(PyEnum):
    """Enum representing different types of entities(db tables names)
    Add new table names here to extend"""

    products = "products"
    club_events = "club_events"
    clubs = "clubs"
    club_announcements = "club_announcements"
    reviews = "reviews"
