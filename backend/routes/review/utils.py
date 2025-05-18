from backend.core.database.models import Club, ClubEvent, Product, User
from backend.core.database.models.review import ReviewableType

REVIEWABLE_TYPE_MODEL_MAP = {
    ReviewableType.products: Product,
    ReviewableType.events: ClubEvent,
}

REVIEWABLE_PARENT_MODEL_MAP = {
    Product: User,
    ClubEvent: Club,
}
