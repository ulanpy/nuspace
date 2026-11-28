from typing import Any

from backend.bootstrap.meilisearch import MeilisearchIndexConfig
from backend.modules.auth.models import User
from backend.modules.pages.models import PageVisibility


def _profile_document(document: dict[str, Any]) -> dict[str, Any]:
    # Search reads a hit's key from `id`; a profile's primary key is its sub.
    document["id"] = document["sub"]
    if not document.get("handle"):
        # A profile is a Source only once it has a handle, and the predicate
        # refuses the rest. Keeping the coarse tier private stops such a row
        # from inflating the counts of a public or members-only search.
        document["profile_visibility"] = PageVisibility.private.value
    return document


# The index is `users` (the table's name, as every index is). Only `name`,
# `surname`, `handle` and the department's name are searchable. Free-form
# `profile_content` is never indexed. `profile_visibility` and `sub` are filter
# facets for the coarse tier and the viewer's own profile (`modules/search`).
PROFILES_INDEX = MeilisearchIndexConfig(
    model=User,
    searchable_columns=[User.name, User.surname, User.handle, User.department_name],
    filterable_attributes=[User.profile_visibility, User.sub],
    primary_key=User.sub,
    document_transformer=_profile_document,
)

MEILISEARCH_INDEXES = [PROFILES_INDEX]
