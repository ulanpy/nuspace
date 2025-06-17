from backend.core.database.models import Community, Event, Product, User
from backend.core.database.models.review import OwnerType, ReviewableType

REVIEWABLE_TYPE_MODEL_MAP = {
    ReviewableType.products: Product,
    ReviewableType.club_events: Event,
}

REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    OwnerType.users: User,
    OwnerType.clubs: Community,
}

SECOND_REVIEWABLE_TYPE_PARENT_MODEL_MAP = {
    Product: User,
    Event: Community,
}
