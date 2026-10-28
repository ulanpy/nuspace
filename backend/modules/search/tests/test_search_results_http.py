"""Searching every structured Source from the root host, through the real app (#437).

`GET /api/search/results` reads the query, an optional kind, `offset` and
`limit`, and answers with ranked Sources the viewer may open, plus estimated
counts. Sources are written the way production writes them (over HTTP, or as
the module's service indexes them) and read back only over HTTP.
"""

import contextlib
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

import httpx
import pytest
from backend.bootstrap.search_indexes import ALL_MEILISEARCH_INDEXES
from backend.common.utils import meilisearch
from backend.modules.courses.models import Course, GradeReport
from backend.modules.courses.registrar.schedule_sync import SCHEDULE_INDEX_UID
from backend.modules.events.models import (
    Event,
    EventStatus,
    EventTag,
    EventType,
    RegistrationPolicy,
)
from backend.modules.events.search_indexes import EVENTS_INDEX
from backend.modules.opportunities.models import Opportunity, OpportunityType
from backend.modules.pages.models import PageVisibility
from backend.modules.pages.search_indexes import PAGES_INDEX
from backend.tests.harness import VIEWER_KINDS, Viewer
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

Settled = Callable[[], Awaitable[None]]


async def _search(viewer: Viewer, q: str, **params) -> dict:
    response = await viewer.client.get("/api/search/results", params={"q": q, **params})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def make_event(app: FastAPI, db: async_sessionmaker[AsyncSession], search_settled: Settled):
    """Store an event and index it as the events service does, then wait for the index."""

    async def _make_event(
        *,
        creator: Viewer,
        name: str,
        status: EventStatus = EventStatus.approved,
        description: str = "An evening on campus.",
        place: str = "Atrium",
    ) -> Event:
        async with db.begin() as session:
            event = Event(
                creator_sub=creator.sub,
                policy=RegistrationPolicy.open,
                name=name,
                place=place,
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

    return _make_event


@pytest.mark.asyncio
async def test_a_guest_finds_a_public_page_at_its_canonical_address(
    guest: Viewer, member: Viewer, search_settled: Settled
) -> None:
    created = await member.client.post(
        "/api/pages",
        json={"name": "Quantum Chess Club", "slug": "quantum-chess", "description": "We play."},
    )
    assert created.status_code == 200
    await search_settled()

    body = await _search(guest, "quantum")

    (result,) = body["results"]
    assert result["id"] == f"page:{created.json()['id']}"
    assert result["kind"] == "page"
    assert result["title"] == "Quantum Chess Club"
    assert result["url"] == "https://pages.nuspace.kz/quantum-chess"
    assert result["host"] == "pages.nuspace.kz"
    assert result["path"] == "quantum-chess"
    assert result["visibility"] is None
    assert result["date"]["role"] == "updated"
    assert result["snippet"]["text"] == "We play."


# --- Who sees what: the predicate matrix -------------------------------------

PAGE_READERS = {
    PageVisibility.public: set(VIEWER_KINDS),
    PageVisibility.internal: {"member", "owner", "page_admin", "site_admin"},
    PageVisibility.private: {"owner", "page_admin", "site_admin"},
}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("tier", "kind", "finds"),
    [
        pytest.param(tier, kind, kind in PAGE_READERS[tier], id=f"{tier.value}-{kind}")
        for tier in PageVisibility
        for kind in VIEWER_KINDS
    ],
)
async def test_a_page_is_found_by_exactly_who_may_read_it(
    app: FastAPI,
    viewers: dict[str, Viewer],
    make_page,
    search_settled: Settled,
    tier: PageVisibility,
    kind: str,
    finds: bool,
) -> None:
    page = await make_page(
        owner=viewers["owner"],
        admins=(viewers["page_admin"],),
        visibility=tier,
        slug="chess-club",
        name="Chess Club",
    )
    # Stored directly, so indexed as the Pages service indexes a save.
    await PAGES_INDEX.upsert(app.state.meilisearch_client, page)
    await search_settled()

    body = await _search(viewers[kind], "chess")

    assert [result["id"] for result in body["results"]] == ([f"page:{page.id}"] if finds else [])
    if finds:
        expected = None if tier == PageVisibility.public else tier.value
        assert body["results"][0]["visibility"] == expected


EVENT_READERS = {
    EventStatus.approved: set(VIEWER_KINDS),
    EventStatus.cancelled: set(VIEWER_KINDS),
    EventStatus.pending: {"owner", "site_admin"},
    EventStatus.rejected: {"owner", "site_admin"},
}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("event_status", "kind", "finds"),
    [
        pytest.param(status, kind, kind in EVENT_READERS[status], id=f"{status.value}-{kind}")
        for status in EventStatus
        for kind in VIEWER_KINDS
    ],
)
async def test_an_event_is_found_by_exactly_who_may_read_it(
    viewers: dict[str, Viewer],
    make_event,
    event_status: EventStatus,
    kind: str,
    finds: bool,
) -> None:
    # `owner` stands for the event's creator.
    event = await make_event(creator=viewers["owner"], status=event_status, name="Chess Night")

    body = await _search(viewers[kind], "chess")

    assert [result["id"] for result in body["results"]] == ([f"event:{event.id}"] if finds else [])


# --- Every structured source, at its canonical address ------------------------


async def _index_rows(app: FastAPI, db: async_sessionmaker[AsyncSession], *rows) -> None:
    """Store rows and index them as their modules do at write time."""
    async with db.begin() as session:
        session.add_all(rows)
    by_model = {index.model: index for index in ALL_MEILISEARCH_INDEXES}
    for row in rows:
        await by_model[type(row)].upsert(app.state.meilisearch_client, row)


async def _reset_catalogue(app: FastAPI, documents: list[dict]) -> None:
    """The registrar catalogue: a Meilisearch index only, filled from GCS by its sync."""
    client = app.state.meilisearch_client
    with contextlib.suppress(RuntimeError):  # no catalogue index yet
        await meilisearch.wait_for_task(
            client, await client.delete(f"/indexes/{SCHEDULE_INDEX_UID}")
        )
    if documents:
        created = await client.post(
            "/indexes", json={"uid": SCHEDULE_INDEX_UID, "primaryKey": "id"}
        )
        await meilisearch.wait_for_task(client, created)
        await meilisearch.upsert_many(client, SCHEDULE_INDEX_UID, documents)


@pytest.mark.asyncio
async def test_each_source_links_to_its_canonical_address(
    app: FastAPI,
    guest: Viewer,
    member: Viewer,
    site_admin: Viewer,
    db: async_sessionmaker[AsyncSession],
    make_event,
    search_settled: Settled,
) -> None:
    opportunity = await site_admin.client.post(
        "/api/opportunities",
        json={"name": "Zebra Fellowship", "type": "grant", "host": "NU Research"},
    )
    assert opportunity.status_code == 201
    event = await make_event(creator=member, name="Zebra Night", place="Block C")
    await _index_rows(
        app,
        db,
        Course(catalog_id="c1", course_code="ZEBR 101", level="UG", school="SSH", term="Fall 2026"),
        GradeReport(course_code="ZEBR 102", course_title="Zebras", term="FA2025", avg_gpa=3.2),
    )
    await _reset_catalogue(
        app,
        [
            {
                "id": "825-ZEBR-103",
                "course_code": "ZEBR 103",
                "term": "Fall 2026",
                "title": "Zebra\nBehaviour",
                "school": "SSH",
                "level": "UG",
                "credits_us": "3.0",
                "sections": [{"faculty": "Dana Kim"}],
            }
        ],
    )
    await search_settled()

    by_title = {
        result["title"]: result for result in (await _search(guest, "zebra"))["results"]
    } | {result["title"]: result for result in (await _search(guest, "ZEBR"))["results"]}

    assert {
        title: (result["kind"], result["url"], result["host"], result["path"])
        for title, result in by_title.items()
    } == {
        "Zebra Fellowship": (
            "opportunity",
            "https://opportunities.nuspace.kz/",
            "opportunities.nuspace.kz",
            "",
        ),
        "Zebra Night": (
            "event",
            f"https://events.nuspace.kz/{event.id}",
            "events.nuspace.kz",
            str(event.id),
        ),
        "ZEBR 101": ("course", "https://courses.nuspace.kz/", "courses.nuspace.kz", ""),
        "ZEBR 102 · Zebras": (
            "course",
            "https://courses.nuspace.kz/stats",
            "courses.nuspace.kz",
            "stats",
        ),
        "ZEBR 103 · Zebra Behaviour": (
            "course",
            "https://courses.nuspace.kz/planner",
            "courses.nuspace.kz",
            "planner",
        ),
    }
    assert by_title["Zebra Night"]["facts"] == ["Social", "Block C"]
    assert by_title["Zebra Night"]["date"]["role"] == "starts"
    assert by_title["Zebra Fellowship"]["facts"] == ["Grant", "NU Research"]
    assert by_title["ZEBR 102 · Zebras"]["facts"] == ["FA2025", "Average GPA 3.20"]
    assert by_title["ZEBR 103 · Zebra Behaviour"]["facts"] == [
        "Fall 2026",
        "3 credits",
        "UG",
        "SSH",
        "Dana Kim",
    ]


@pytest.mark.asyncio
async def test_a_snippet_is_cropped_around_the_match_and_marks_it(
    guest: Viewer, member: Viewer, make_event
) -> None:
    filler = " ".join(f"word{n}" for n in range(60))
    await make_event(
        creator=member,
        name="Workshop",
        description=f"{filler} bring a laptop to the robotics lab {filler}",
    )

    (result,) = (await _search(guest, "robotics"))["results"]

    snippet = result["snippet"]
    assert len(snippet["text"].split()) <= 32  # 30 words, plus the crop markers
    (match,) = snippet["matches"]
    assert snippet["text"][match["start"] : match["start"] + match["length"]] == "robotics"


@pytest.mark.asyncio
async def test_a_missing_catalogue_index_does_not_break_search(
    app: FastAPI, guest: Viewer, member: Viewer, make_event
) -> None:
    await _reset_catalogue(app, [])  # deleted, as before the first catalogue sync
    await make_event(creator=member, name="Chess Night")

    body = await _search(guest, "chess")

    assert [result["title"] for result in body["results"]] == ["Chess Night"]


@pytest.mark.asyncio
async def test_search_answers_503_when_the_index_is_down(
    app: FastAPI, guest: Viewer, monkeypatch: pytest.MonkeyPatch
) -> None:
    unreachable = httpx.AsyncClient(base_url="http://127.0.0.1:9", timeout=1)
    monkeypatch.setattr(app.state, "meilisearch_client", unreachable)

    response = await guest.client.get("/api/search/results", params={"q": "chess"})

    await unreachable.aclose()
    assert response.status_code == 503
    assert response.json()["detail"] == "Search is unavailable"


# --- Kinds, counts and the pager ---------------------------------------------


@pytest.mark.asyncio
async def test_the_kind_filter_narrows_results_but_every_chip_keeps_its_count(
    app: FastAPI,
    guest: Viewer,
    member: Viewer,
    db: async_sessionmaker[AsyncSession],
    make_event,
    search_settled: Settled,
) -> None:
    await make_event(creator=member, name="Chess Night")
    await make_event(creator=member, name="Chess Morning")
    await _index_rows(app, db, Opportunity(name="Chess Grant", type=OpportunityType.GRANT))
    await search_settled()

    everything = await _search(guest, "chess")
    events = await _search(guest, "chess", kind="event")

    expected_counts = {"page": 0, "event": 2, "opportunity": 1, "course": 0}
    assert everything["counts"] == expected_counts
    assert everything["estimated_total"] == 3
    assert len(everything["results"]) == 3

    assert events["counts"] == expected_counts
    assert events["estimated_total"] == 2
    assert {result["kind"] for result in events["results"]} == {"event"}
    assert len(events["results"]) == 2


@pytest.mark.asyncio
async def test_counts_are_estimated_before_the_predicate_but_after_the_coarse_filter(
    guest: Viewer, owner: Viewer, make_event
) -> None:
    await make_event(creator=owner, name="Chess Night")
    await make_event(creator=owner, name="Chess Draft", status=EventStatus.pending)

    assert (await _search(guest, "chess"))["counts"]["event"] == 1
    assert (await _search(owner, "chess"))["counts"]["event"] == 2


@pytest.mark.asyncio
async def test_the_pager_walks_every_result_once_then_stops(
    app: FastAPI,
    guest: Viewer,
    db: async_sessionmaker[AsyncSession],
    search_settled: Settled,
) -> None:
    await _index_rows(
        app,
        db,
        *(Opportunity(name=f"Fellowship {n}", type=OpportunityType.GRANT) for n in range(12)),
    )
    await search_settled()

    pages = [await _search(guest, "fellowship", offset=offset, limit=5) for offset in (0, 5, 10)]

    assert [len(page["results"]) for page in pages] == [5, 5, 2]
    assert [page["next_offset"] for page in pages] == [5, 10, None]
    ids = [result["id"] for page in pages for result in page["results"]]
    assert len(set(ids)) == 12
    assert all(page["estimated_total"] == 12 for page in pages)


@pytest.mark.asyncio
async def test_the_pager_is_empty_past_max_total_hits(
    app: FastAPI,
    guest: Viewer,
    db: async_sessionmaker[AsyncSession],
    search_settled: Settled,
) -> None:
    await _index_rows(app, db, Opportunity(name="Fellowship", type=OpportunityType.GRANT))
    await search_settled()

    body = await _search(guest, "fellowship", offset=1000)

    assert body["results"] == []
    assert body["next_offset"] is None
    assert body["counts"]["opportunity"] == 1


@pytest.mark.asyncio
async def test_a_blank_query_finds_nothing(guest: Viewer, member: Viewer, make_event) -> None:
    await make_event(creator=member, name="Chess Night")

    body = await _search(guest, "   ")

    assert body["results"] == []
    assert body["estimated_total"] == 0
