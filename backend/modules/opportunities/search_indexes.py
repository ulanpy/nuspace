from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.opportunities.models import Opportunity

OPPORTUNITIES_INDEX = MeilisearchIndexConfig(
    model=Opportunity,
    searchable_columns=[Opportunity.name, Opportunity.description],
    filterable_attributes=None,
    primary_key=Opportunity.id,
)

MEILISEARCH_INDEXES = [OPPORTUNITIES_INDEX]
