from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.pages.models import Page

# `visibility` is a filter facet: stored in the document and filterable, never searched.
PAGES_INDEX = MeilisearchIndexConfig(
    model=Page,
    searchable_columns=[Page.name],
    filterable_attributes=[Page.visibility],
    primary_key=Page.id,
)

MEILISEARCH_INDEXES = [PAGES_INDEX]
