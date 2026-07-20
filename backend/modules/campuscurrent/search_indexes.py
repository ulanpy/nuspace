from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.campuscurrent.models import Community, Event

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=Event,
        searchable_columns=[Event.name, Event.description],
        filterable_attributes=None,
        primary_key=Event.id,
    ),
    MeilisearchIndexConfig(
        model=Community,
        searchable_columns=[Community.name, Community.description],
        filterable_attributes=None,
        primary_key=Community.id,
    ),
]
