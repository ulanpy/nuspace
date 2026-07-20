from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.core.database.models import Opportunity

MEILISEARCH_INDEXES = [
    MeilisearchIndexConfig(
        model=Opportunity,
        searchable_columns=[Opportunity.name, Opportunity.description],
        filterable_attributes=None,
        primary_key=Opportunity.id,
    ),
]
