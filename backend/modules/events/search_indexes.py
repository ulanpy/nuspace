from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.events.models import Event

# `status` is a filter facet: stored in the document and filterable, never searched.
# `id` is filterable so search can let a creator's own pending events past the
# coarse `status` filter (`modules/search/sources.py`).
EVENTS_INDEX = MeilisearchIndexConfig(
    model=Event,
    searchable_columns=[Event.name, Event.description],
    filterable_attributes=[Event.status, Event.id],
    primary_key=Event.id,
)

MEILISEARCH_INDEXES = [EVENTS_INDEX]
