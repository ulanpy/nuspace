"""New Telegram channel messages arrive from the `t.me/s/` preview, without a session (#444).

Recorded preview pages stand in for t.me at the HTTP seam; a fake GCS holds the
export. What the poller appends is read back only over `GET /api/search/results`.
"""

import contextlib
import json
from collections.abc import AsyncIterator, Awaitable, Callable
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from backend.bootstrap.meilisearch import delete_index
from backend.modules.search import channel_poll_job
from backend.modules.search.channel_messages import ingest_channel
from backend.modules.search.channel_poll import ParseError, parse_page, poll_channel
from backend.tests.harness import Viewer
from fastapi import FastAPI

Settled = Callable[[], Awaitable[None]]

CHANNEL = "nu_test_channel"
FIXTURES = Path(__file__).parent / "fixtures"
EXPORT_OBJECT = f"telegram/{CHANNEL}/result.json"
STATE_OBJECT = f"telegram/{CHANNEL}/poll.json"

PAGES = {
    None: "tme_page_newest.html",
    "103": "tme_page_before_103.html",
    "101": "tme_page_before_101.html",
}


def _page(name: str) -> str:
    return (FIXTURES / name).read_text(encoding="utf-8")


class RecordedTme:
    """t.me/s/<channel> as recorded; remembers which pages were asked for."""

    def __init__(self, pages: dict[str | None, str] = PAGES) -> None:
        self.pages = pages
        self.requested: list[str | None] = []

    def transport(self) -> httpx.MockTransport:
        def handle(request: httpx.Request) -> httpx.Response:
            assert request.url.path == f"/s/{CHANNEL}"
            before = request.url.params.get("before")
            self.requested.append(before)
            return httpx.Response(200, text=_page(self.pages[before]))

        return httpx.MockTransport(handle)


class _Blob:
    def __init__(self, objects: dict[str, bytes], name: str) -> None:
        self.objects, self.name = objects, name

    def exists(self) -> bool:
        return self.name in self.objects

    def download_as_bytes(self) -> bytes:
        return self.objects[self.name]

    def upload_from_string(self, data: str, content_type: str | None = None) -> None:
        self.objects[self.name] = data.encode()


class FakeGcs:
    def __init__(self, objects: dict[str, bytes] | None = None) -> None:
        self.objects = objects if objects is not None else {}

    def bucket(self, _name: str) -> "FakeGcs":
        return self

    def blob(self, object_name: str) -> _Blob:
        return _Blob(self.objects, object_name)


def _earlier_export() -> dict[str, bytes]:
    export = {
        "name": CHANNEL,
        "type": "public_channel",
        "messages": [
            {"id": 101, "type": "message", "date": "2024-09-02T10:15:00", "text": "CSCI 151 moved"},
            {"id": 102, "type": "message", "date": "2024-09-03T09:00:00", "text": "Office hours"},
        ],
    }
    return {EXPORT_OBJECT: json.dumps(export).encode()}


def test_a_recorded_preview_page_parses_to_its_posts() -> None:
    posts = parse_page(CHANNEL, _page("tme_page_newest.html"))

    assert [p["id"] for p in posts] == [103, 104, 105]
    assert posts[0] == {
        "id": 103,
        "type": "message",
        "date": "2024-09-05T08:00:00+00:00",
        "from": "Registrar",
        "text": "Midterm schedule for CSCI 235 is out\nRoom 7.105",
    }
    assert posts[1]["from"] is None
    assert posts[2]["text"] == "Career fair registration is open"


def test_a_changed_layout_yields_no_posts() -> None:
    html = _page("tme_page_changed_layout.html")

    assert parse_page(CHANNEL, html) == []  # no posts: the walk decides if that is an error


@pytest_asyncio.fixture
async def cleanup_index(app: FastAPI) -> AsyncIterator[None]:
    yield
    with contextlib.suppress(Exception):
        await delete_index(app.state.meilisearch_client, f"telegram_{CHANNEL}")


async def _search(viewer: Viewer, q: str) -> list[dict]:
    response = await viewer.client.get("/api/search/results", params={"q": q, "kind": "message"})
    assert response.status_code == 200, response.text
    return response.json()["results"]


@pytest.mark.asyncio
async def test_the_walk_stops_at_the_watermark_and_new_posts_become_searchable(
    app: FastAPI, guest: Viewer, search_settled: Settled, cleanup_index: None
) -> None:
    gcs = FakeGcs(_earlier_export())
    tme = RecordedTme()
    async with httpx.AsyncClient(transport=tme.transport(), base_url="https://t.me") as http:
        added = await poll_channel(http, gcs, "bucket", CHANNEL)  # type: ignore[arg-type]

    assert added == 3
    assert tme.requested == [None, "103"]  # never asked for the page before 101
    assert json.loads(gcs.objects[STATE_OBJECT])["watermark"] == 105

    assert await ingest_channel(app.state.meilisearch_client, gcs, "bucket", CHANNEL) == 5  # type: ignore[arg-type]
    await search_settled()
    result = (await _search(guest, "CSCI 235"))[0]  # 101 ("CSCI 151") may follow on "CSCI" alone
    assert result["id"] == f"telegram_{CHANNEL}:103"
    assert result["url"] == f"https://t.me/{CHANNEL}/103"
    assert len(await _search(guest, "Career fair")) == 1
    assert len(await _search(guest, "Nurgaliyev")) == 0  # 102's real text was never in the export


@pytest.mark.asyncio
async def test_a_second_poll_with_nothing_new_adds_nothing() -> None:
    gcs = FakeGcs(_earlier_export())
    async with httpx.AsyncClient(transport=RecordedTme().transport(), base_url="https://t.me") as http:
        await poll_channel(http, gcs, "bucket", CHANNEL)  # type: ignore[arg-type]
        tme = RecordedTme()
        async with httpx.AsyncClient(transport=tme.transport(), base_url="https://t.me") as again:
            assert await poll_channel(again, gcs, "bucket", CHANNEL) == 0  # type: ignore[arg-type]

    assert tme.requested == [None]  # the normal day: one fetch, already at the watermark


@pytest.mark.asyncio
async def test_a_parse_failure_raises_an_alert(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BUCKET_NAME", "bucket")
    monkeypatch.setenv("TELEGRAM_POLL_CHANNELS", CHANNEL)
    alerts: list[str] = []

    async def record(text: str) -> None:
        alerts.append(text)

    monkeypatch.setattr(channel_poll_job, "send_alert", record)
    tme = RecordedTme({None: "tme_page_changed_layout.html"})
    async with httpx.AsyncClient(transport=tme.transport(), base_url="https://t.me") as http:
        failures = await channel_poll_job.run(http, FakeGcs())  # type: ignore[arg-type]

    assert failures == 1
    assert len(alerts) == 1 and CHANNEL in alerts[0]
    with pytest.raises(ParseError):
        async with httpx.AsyncClient(transport=tme.transport(), base_url="https://t.me") as http:
            await poll_channel(http, FakeGcs(), "bucket", CHANNEL)  # type: ignore[arg-type]
