from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.events.models import Event

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=Event,
        searchable_columns=[Event.name, Event.description],
        filterable_attributes=None,
        primary_key=Event.id,
    ),
]
