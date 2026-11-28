"""Every Meilisearch index backed by a Postgres table, gathered from the modules.

The app's lifespan and the rebuild command both read this list, so a module that
contributes an index is picked up by both.
"""

from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.courses.search_indexes import (
    MEILISEARCH_INDEXES as COURSES_MEILI_INDEXES,
)
from backend.modules.events.search_indexes import (
    MEILISEARCH_INDEXES as EVENTS_MEILI_INDEXES,
)
from backend.modules.pages.search_indexes import (
    MEILISEARCH_INDEXES as PAGES_MEILI_INDEXES,
)
from backend.modules.profiles.search_indexes import (
    MEILISEARCH_INDEXES as PROFILES_MEILI_INDEXES,
)

ALL_MEILISEARCH_INDEXES: list[MeilisearchIndexConfig] = [
    *PAGES_MEILI_INDEXES,
    *EVENTS_MEILI_INDEXES,
    *COURSES_MEILI_INDEXES,
    *PROFILES_MEILI_INDEXES,
]
