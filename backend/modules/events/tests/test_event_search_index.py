"""Event keyword search queried an index that nothing ever created.

The read path asked Meilisearch for `community_events` (a media `EntityType`),
while the bootstrap creates each index from `model.__tablename__` (`events`).
Meilisearch answered 404 `index_not_found`, so `GET /events?keyword=...` was a
500 from the day it was written. The two sides must agree on one uid.
"""

import pytest
from backend.modules.events import schemas
from backend.modules.events.models import Event
from backend.modules.events.repository import EventRepository
from backend.modules.events.search_indexes import MEILISEARCH_INDEXES
from backend.modules.media.models import EntityType


@pytest.mark.asyncio
async def test_keyword_search_queries_the_index_the_bootstrap_creates(monkeypatch) -> None:
    queried: list[str] = []

    async def search(*, storage_name: str, **_kwargs):
        queried.append(storage_name)
        return {"hits": [], "estimatedTotalHits": 0}

    monkeypatch.setattr("backend.modules.events.repository.meilisearch.get", search)

    await EventRepository(db_session=None).list_events_for_screen(
        event_filter=schemas.EventFilter(keyword="concert"),
        creator_sub=None,
        meilisearch_client=object(),
        viewer_sub=None,
    )

    # The bootstrap names each index `index_config.model.__tablename__`.
    created = {config.model.__tablename__ for config in MEILISEARCH_INDEXES}
    assert queried == [Event.__tablename__]
    assert set(queried) <= created
    assert EntityType.community_events.value not in queried
