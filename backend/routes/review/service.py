from backend.core.database.models import Club, ClubEvent, Product, User
from backend.core.database.models.review import OwnerType, ReviewableType

REVIEWABLE_TYPE_MODEL_MAP = {
    ReviewableType.products: Product,
    ReviewableType.club_events: ClubEvent,
}

REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    OwnerType.users: User,
    OwnerType.clubs: Club,
}

SECOND_REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    Product: User,
    ClubEvent: Club,
}
