from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.pages.models import Page

# `visibility` is a filter facet: stored in the document and filterable, never searched.
# `id` is filterable so search can let a viewer's own non-public Pages past the
# coarse `visibility` filter (`modules/search/sources.py`).
PAGES_INDEX = MeilisearchIndexConfig(
    model=Page,
    searchable_columns=[Page.name],
    filterable_attributes=[Page.visibility, Page.id],
    primary_key=Page.id,
)

MEILISEARCH_INDEXES = [PAGES_INDEX]
