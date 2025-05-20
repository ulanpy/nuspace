from backend.core.database.models import Club, ClubEvent, Product, User
from backend.core.database.models.review import OwnerType, ReviewableType

REVIEWABLE_TYPE_MODEL_MAP = {
    ReviewableType.products: Product,
    ReviewableType.events: ClubEvent,
}

REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    OwnerType.user: User,
    OwnerType.club: Club,
}

SECOND_REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    Product: User,
    ClubEvent: Club,
}
