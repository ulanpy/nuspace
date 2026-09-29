from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.pages.models import Community

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=Community,
        searchable_columns=[Community.name],
        filterable_attributes=None,
        primary_key=Community.id,
    ),
]
