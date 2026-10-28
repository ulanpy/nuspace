"""The search indexes outlive a restart and stay current without a rebuild (#438).

Writes go over HTTP and are read back over HTTP. Meilisearch is read directly
only where the index itself is the thing under test: that boot leaves it alone,
and that the rebuild and the write-time upsert produce the same documents.
"""

import asyncio
import contextlib
import csv
import sys
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend.bootstrap import meilisearch as bootstrap
from backend.bootstrap.search_indexes import ALL_MEILISEARCH_INDEXES
from backend.common.utils import meilisearch
from backend.modules.courses.csv_parsers.grade_reports import dump_csv_to_database
from backend.modules.courses.models import Course, GradeReport
from backend.modules.courses.registrar.schemas import (
    SchedulePreferences,
    ScheduleResponse,
    SemesterOption,
)
from backend.modules.courses.registrar.service import RegistrarService
from backend.modules.events.models import (
    Event,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.modules.opportunities.models import Opportunity, OpportunityType
from backend.modules.pages.models import PageVisibility
from backend.tests.harness import BACKEND_DIR, Viewer

Settled = Callable[[], Awaitable[None]]


async def _documents(app: FastAPI, uid: str) -> dict[int | str, dict]:
    response = await app.state.meilisearch_client.get(
        f"/indexes/{uid}/documents", params={"limit": 1000}
    )
    response.raise_for_status()
    return {doc["id"]: doc for doc in response.json()["results"]}


# --- Write-time maintenance, over HTTP ---------------------------------------


@pytest.mark.asyncio
async def test_an_opportunity_is_searchable_from_create_to_delete(
    guest: Viewer, site_admin: Viewer, search_settled: Settled
) -> None:
    created = await site_admin.client.post(
        "/api/opportunities",
        json={"name": "Quantum Fellowship", "type": "grant", "description": "for physicists"},
    )
    assert created.status_code == 201
    opportunity_id = created.json()["id"]

    async def search(keyword: str) -> list[int]:
        await search_settled()
        response = await guest.client.get("/api/opportunities", params={"q": keyword})
        assert response.status_code == 200
        return [item["id"] for item in response.json()["items"]]

    assert await search("Quantum") == [opportunity_id]

    edited = await site_admin.client.patch(
        f"/api/opportunities/{opportunity_id}", json={"name": "Zebra Fellowship"}
    )
    assert edited.status_code == 200
    assert await search("Quantum") == []
    assert await search("Zebra") == [opportunity_id]

    deleted = await site_admin.client.delete(f"/api/opportunities/{opportunity_id}")
    assert deleted.status_code == 204
    assert await search("Zebra") == []


@pytest.mark.asyncio
async def test_a_page_is_searchable_from_create_to_delete(
    guest: Viewer, member: Viewer, search_settled: Settled
) -> None:
    created = await member.client.post(
        "/api/pages",
        json={"name": "Quantum Chess Club", "slug": "quantum-chess"},
    )
    assert created.status_code == 200

    async def search(keyword: str) -> list[str]:
        await search_settled()
        response = await guest.client.get("/api/pages", params={"keyword": keyword})
        assert response.status_code == 200
        return [item["slug"] for item in response.json()["items"]]

    assert await search("Quantum") == ["quantum-chess"]

    edited = await member.client.patch(
        "/api/pages/quantum-chess", json={"name": "Zebra Chess Club"}
    )
    assert edited.status_code == 200
    assert await search("Quantum") == []
    assert await search("Zebra") == ["quantum-chess"]

    assert (await member.client.delete("/api/pages/quantum-chess")).status_code == 204
    assert await search("Zebra") == []


@pytest.mark.asyncio
async def test_a_course_created_by_a_schedule_sync_is_searchable(
    app: FastAPI,
    guest: Viewer,
    member: Viewer,
    search_settled: Settled,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # The registrar boundary: the active term, the catalog it comes from and
    # the PDF a student uploads. `courses` rows are written only by this sync.
    monkeypatch.setattr(
        app.state, "active_registrar_semester", SemesterOption(label="Fall 2026", value="825")
    )
    monkeypatch.setattr(
        RegistrarService,
        "parse_schedule_pdf",
        lambda self, pdf: ScheduleResponse(
            data=[[] for _ in range(7)],
            preferences=SchedulePreferences(classes=["PHYS 161"], colors={}),
        ),
    )
    # Its own primary key, since `term_id` makes inferring one ambiguous.
    client = app.state.meilisearch_client
    with contextlib.suppress(RuntimeError):  # no catalog index yet
        await meilisearch.wait_for_task(
            client, await client.delete("/indexes/course_schedule_catalog")
        )
    created = await client.post(
        "/indexes", json={"uid": "course_schedule_catalog", "primaryKey": "id"}
    )
    await meilisearch.wait_for_task(client, created)
    await meilisearch.upsert_many(
        app.state.meilisearch_client,
        "course_schedule_catalog",
        [
            {
                "id": "cat-phys-161",
                "course_code": "PHYS 161",
                "term": "Fall 2026",
                "term_id": "825",
                "title": "Physics I",
                "school": "SSH",
                "level": "UG",
            }
        ],
    )
    await search_settled()

    synced = await member.client.post(
        "/api/registered_courses/sync/pdf", json={"pdf_file": "not-a-real-pdf"}
    )
    assert synced.status_code == 200, synced.text
    await search_settled()

    found = await guest.client.get("/api/courses", params={"keyword": "PHYS"})
    assert found.status_code == 200
    assert [course["course_code"] for course in found.json()["courses"]] == ["PHYS 161"]


@pytest.mark.asyncio
async def test_grade_reports_loaded_from_a_csv_are_searchable(
    app: FastAPI, guest: Viewer, search_settled: Settled, tmp_path: Path
) -> None:
    csv_path = tmp_path / "grades.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["course_code", "course_title", "term"])
        writer.writeheader()
        for number in range(1, 4):
            writer.writerow(
                {"course_code": f"ZOOL {number}", "course_title": "Zoology", "term": "FA2025"}
            )

    stats = await dump_csv_to_database(
        str(csv_path),
        app.state.db_manager,
        app.state.meilisearch_client,
        batch_size=2,
    )
    assert stats == {"inserted": 3, "errors": 0}
    await search_settled()

    found = await guest.client.get("/api/grades", params={"keyword": "Zoology"})
    assert found.status_code == 200
    assert len(found.json()["items"]) == 3


# --- Startup leaves the indexes alone ----------------------------------------


@pytest.mark.asyncio
async def test_startup_keeps_what_the_indexes_hold(app: FastAPI, db) -> None:
    client = app.state.meilisearch_client
    response = await client.post("/indexes/pages/documents", json=[{"id": 1, "name": "Survivor"}])
    await meilisearch.wait_for_task(client, response)

    # What the lifespan runs for Meilisearch, against a fresh app object.
    restarted = FastAPI()
    await bootstrap.setup_meilisearch(restarted, index_configs=ALL_MEILISEARCH_INDEXES)
    await restarted.state.meili_ensure_task
    try:
        survivors = await _documents(app, "pages")
    finally:
        await bootstrap.cleanup_meilisearch(restarted)

    assert survivors[1]["name"] == "Survivor"


@pytest.mark.asyncio
async def test_startup_creates_missing_indexes_with_their_facets(app: FastAPI, db) -> None:
    client = app.state.meilisearch_client
    response = await client.delete("/indexes/pages")
    await meilisearch.wait_for_task(client, response)

    restarted = FastAPI()
    await bootstrap.setup_meilisearch(restarted, index_configs=ALL_MEILISEARCH_INDEXES)
    await restarted.state.meili_ensure_task
    await bootstrap.cleanup_meilisearch(restarted)

    settings = (await client.get("/indexes/pages/settings")).json()
    assert settings["searchableAttributes"] == ["name"]
    assert settings["filterableAttributes"] == ["visibility", "id"]
    assert (await _documents(app, "pages")) == {}


# --- The explicit rebuild ----------------------------------------------------


class _CountingClient:
    """The app's Meilisearch client, counting the document batches sent to each index."""

    def __init__(self, inner: httpx.AsyncClient) -> None:
        self._inner = inner
        self.batches: list[tuple[str, int]] = []

    async def post(self, url, **kwargs):
        if url.endswith("/documents"):
            self.batches.append((url.split("/")[2], len(kwargs["json"])))
        return await self._inner.post(url, **kwargs)

    def __getattr__(self, name):
        return getattr(self._inner, name)


@pytest.mark.asyncio
async def test_the_rebuild_repopulates_from_postgres_in_batches(
    app: FastAPI,
    guest: Viewer,
    member: Viewer,
    db: async_sessionmaker[AsyncSession],
    search_settled: Settled,
) -> None:
    async with db.begin() as session:
        session.add_all(
            Opportunity(name=f"Rebuilt Fellowship {n}", type=OpportunityType.GRANT)
            for n in range(5)
        )
    # A document whose row is gone: the rebuild must not keep it.
    await meilisearch.upsert(
        app.state.meilisearch_client, "opportunities", {"id": 999, "name": "Rebuilt Ghost"}
    )
    await search_settled()

    client = _CountingClient(app.state.meilisearch_client)
    counts = await bootstrap.rebuild_indexes(
        client, app.state.db_manager, ALL_MEILISEARCH_INDEXES, batch_size=2
    )

    assert counts["opportunities"] == 5
    assert [n for uid, n in client.batches if uid.startswith("opportunities")] == [2, 2, 1]
    response = await guest.client.get("/api/opportunities", params={"q": "Rebuilt", "size": 20})
    names = sorted(item["name"] for item in response.json()["items"])
    assert names == [f"Rebuilt Fellowship {n}" for n in range(5)]
    # No staging index is left behind.
    uids = {
        index["uid"]
        for index in (await app.state.meilisearch_client.get("/indexes")).json()["results"]
    }
    assert not any(uid.endswith("__rebuild") for uid in uids)


@pytest.mark.asyncio
async def test_the_rebuild_command_fills_the_indexes(
    guest: Viewer, db: async_sessionmaker[AsyncSession], search_settled: Settled
) -> None:
    async with db.begin() as session:
        session.add(Opportunity(name="Commanded Fellowship", type=OpportunityType.GRANT))

    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-m",
        "backend.bootstrap.rebuild_search",
        "--skip-catalog",
        cwd=BACKEND_DIR.parent,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    output, _ = await process.communicate()

    assert process.returncode == 0, output.decode()
    assert "opportunities: 1 documents" in output.decode()
    response = await guest.client.get("/api/opportunities", params={"q": "Commanded"})
    assert [item["name"] for item in response.json()["items"]] == ["Commanded Fellowship"]


@pytest.mark.asyncio
async def test_the_rebuild_and_the_write_time_upsert_write_the_same_documents(
    app: FastAPI,
    member: Viewer,
    site_admin: Viewer,
    db: async_sessionmaker[AsyncSession],
    search_settled: Settled,
) -> None:
    # Written at write time, over HTTP.
    assert (
        await member.client.post(
            "/api/pages",
            json={"name": "Same Fields", "slug": "same-fields", "visibility": "internal"},
        )
    ).status_code == 200
    assert (
        await site_admin.client.post(
            "/api/opportunities", json={"name": "Same Fields", "type": "forum"}
        )
    ).status_code == 201
    async with db.begin() as session:
        session.add(
            Event(
                creator_sub=member.sub,
                policy=RegistrationPolicy.open,
                name="Same Fields",
                place="Hall",
                start_datetime=datetime(2030, 1, 1, tzinfo=timezone.utc),
                end_datetime=datetime(2030, 1, 2, tzinfo=timezone.utc),
                description="an event",
                type=EventType.social,
                status=EventStatus.approved,
                tag=EventTag.regular,
            )
        )
        session.add(
            Course(catalog_id="c1", course_code="SAME 1", level="UG", school="SSH", term="FA")
        )
        session.add(GradeReport(course_code="SAME 1", course_title="Same", term="FA2025"))
    # The event and the course were inserted directly, so index them as the
    # service does, from the stored rows.
    async with db() as session:
        for index in ALL_MEILISEARCH_INDEXES:
            if index.uid in {"events", "courses", "grade_reports"}:
                rows = (await session.execute(select(index.model))).scalars().all()
                await index.upsert_many(app.state.meilisearch_client, rows)
    await search_settled()
    at_write_time = {
        index.uid: await _documents(app, index.uid) for index in ALL_MEILISEARCH_INDEXES
    }

    await bootstrap.rebuild_indexes(
        app.state.meilisearch_client, app.state.db_manager, ALL_MEILISEARCH_INDEXES
    )

    rebuilt = {index.uid: await _documents(app, index.uid) for index in ALL_MEILISEARCH_INDEXES}
    assert rebuilt == at_write_time
    assert all(rebuilt[uid] for uid in rebuilt)
    # Filter facets travel in the document without being searched.
    (page,) = rebuilt["pages"].values()
    assert page["visibility"] == PageVisibility.internal.value
    (event,) = rebuilt["events"].values()
    assert event["status"] == "approved"
