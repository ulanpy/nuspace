"""Searching in Russian finds English content, through the faked embedder (#441).

The embedder is the one boundary faked: it maps words to concepts so that a
Russian query and an English document about the same thing land close together.
Everything else is real: pgvector, Meilisearch, the app.
"""

import hashlib
from collections.abc import Awaitable, Callable, Sequence
from datetime import datetime, timezone

import pytest
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.modules.events.models import (
    Event,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.modules.events.search_indexes import EVENTS_INDEX
from backend.modules.search.embeddings import DIMENSIONS, EmbedTask
from backend.tests.harness import Viewer

Settled = Callable[[], Awaitable[None]]

CONCEPTS = {"стипендия": 0, "scholarship": 0, "футбол": 1, "football": 1}


class FakeEmbedder:
    """Deterministic vectors: a known word adds its concept's axis, any other word a hashed one."""

    async def embed(self, texts: Sequence[str], *, task: EmbedTask) -> list[list[float]]:
        return [self._vector(body) for body in texts]

    @staticmethod
    def _vector(body: str) -> list[float]:
        vector = [0.0] * DIMENSIONS
        for word in body.lower().split():
            word = word.strip(".,!?")
            if word in CONCEPTS:
                vector[CONCEPTS[word]] += 10.0
            else:
                axis = 10 + int(hashlib.sha256(word.encode()).hexdigest(), 16) % (DIMENSIONS - 10)
                vector[axis] += 1.0
        return vector


@pytest.fixture(autouse=True)
def fake_embedder(app: FastAPI, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(app.state.embeddings, "embedder", FakeEmbedder())


async def _event(
    app: FastAPI,
    db: async_sessionmaker[AsyncSession],
    search_settled: Settled,
    *,
    creator: Viewer,
    name: str,
    description: str,
    status: EventStatus = EventStatus.approved,
) -> Event:
    """Store an event and index it as the events service does."""
    async with db.begin() as session:
        event = Event(
            creator_sub=creator.sub,
            policy=RegistrationPolicy.open,
            name=name,
            place="Atrium",
            start_datetime=datetime(2030, 1, 1, 18, tzinfo=timezone.utc),
            end_datetime=datetime(2030, 1, 1, 20, tzinfo=timezone.utc),
            description=description,
            type=EventType.social,
            status=status,
            tag=EventTag.regular,
        )
        session.add(event)
    await EVENTS_INDEX.upsert(app.state.meilisearch_client, event)
    await search_settled()
    return event


async def _ids(viewer: Viewer, q: str) -> list[str]:
    response = await viewer.client.get("/api/search/results", params={"q": q})
    assert response.status_code == 200, response.text
    return [result["id"] for result in response.json()["results"]]


@pytest.mark.asyncio
async def test_a_russian_query_finds_an_english_scholarship(
    app: FastAPI, db, search_settled: Settled, guest: Viewer, member: Viewer
) -> None:
    scholarship = await _event(
        app, db, search_settled, creator=member, name="Scholarship", description="Apply by May."
    )
    await _event(
        app, db, search_settled, creator=member, name="Football", description="Friday match."
    )

    assert await _ids(guest, "стипендия") == [f"event:{scholarship.id}"]


@pytest.mark.asyncio
async def test_embeddings_are_written_and_removed_with_the_index_document(
    app: FastAPI, db, search_settled: Settled, member: Viewer
) -> None:
    async def stored() -> list[str]:
        async with db() as session:
            rows = await session.execute(text("SELECT source || ':' || key FROM search_embeddings"))
            return list(rows.scalars().all())

    event = await _event(
        app, db, search_settled, creator=member, name="Scholarship", description="Apply by May."
    )
    assert await stored() == [f"event:{event.id}"]

    await EVENTS_INDEX.delete(app.state.meilisearch_client, event.id)
    assert await stored() == []


@pytest.mark.asyncio
@pytest.mark.parametrize(("kind", "finds"), [("guest", False), ("owner", True)])
async def test_the_predicate_still_applies_after_the_merge(
    app: FastAPI,
    db,
    search_settled: Settled,
    viewers: dict[str, Viewer],
    kind: str,
    finds: bool,
) -> None:
    pending = await _event(
        app,
        db,
        search_settled,
        creator=viewers["owner"],
        name="Scholarship",
        description="Awaiting approval.",
        status=EventStatus.pending,
    )

    expected = [f"event:{pending.id}"] if finds else []
    assert await _ids(viewers[kind], "стипендия") == expected
