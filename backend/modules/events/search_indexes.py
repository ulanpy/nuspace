from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.events.models import Event

# `status` is a filter facet: stored in the document and filterable, never searched.
EVENTS_INDEX = MeilisearchIndexConfig(
    model=Event,
    searchable_columns=[Event.name, Event.description],
    filterable_attributes=[Event.status],
    primary_key=Event.id,
)

MEILISEARCH_INDEXES = [EVENTS_INDEX]
