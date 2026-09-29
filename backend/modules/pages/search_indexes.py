from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.pages.models import Page

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=Page,
        searchable_columns=[Page.name],
        filterable_attributes=None,
        primary_key=Page.id,
    ),
]
