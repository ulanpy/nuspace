"""Telegram channel messages are searchable from their exports in GCS (#442).

An export recorded in a fake GCS goes through the ingestion action, and is read
back only over `GET /api/search/results`.
"""

import contextlib
import json
from collections.abc import AsyncIterator, Awaitable, Callable

import pytest
import pytest_asyncio
from backend.bootstrap.meilisearch import delete_index
from backend.modules.search.channel_messages import ingest_channel
from backend.tests.harness import Viewer
from fastapi import FastAPI

Settled = Callable[[], Awaitable[None]]

CHANNEL = "nu_test_channel"

EXPORT = {
    "name": "NU test channel",
    "type": "public_channel",
    "id": 1,
    "messages": [
        {
            "id": 101,
            "type": "message",
            "date": "2024-09-02T10:15:00",
            "from": "Aigerim Sadykova",
            "text": "CSCI 151 moved to room 7.222 this week",
        },
        {
            "id": 102,
            "type": "message",
            "date": "2024-09-03T09:00:00",
            "from": None,
            "text": [
                "Office hours with ",
                {"type": "bold", "text": "Dr. Nurgaliyev"},
                " are on Friday",
            ],
        },
        {"id": 103, "type": "service", "date": "2024-09-03T09:05:00", "action": "pin_message"},
        {"id": 104, "type": "message", "date": "2024-09-04T09:00:00", "text": "", "photo": "p.jpg"},
    ],
}


class _Blob:
    def __init__(self, data: bytes | None) -> None:
        self.data = data

    def exists(self) -> bool:
        return self.data is not None

    def download_as_bytes(self) -> bytes:
        assert self.data is not None
        return self.data


class FakeGcs:
    """A bucket of recorded objects, read the way the ingester reads GCS."""

    def __init__(self, objects: dict[str, bytes]) -> None:
        self.objects = objects

    def bucket(self, _name: str) -> "FakeGcs":
        return self

    def blob(self, object_name: str) -> _Blob:
        return _Blob(self.objects.get(object_name))


@pytest_asyncio.fixture
async def ingested(app: FastAPI, search_settled: Settled) -> AsyncIterator[None]:
    gcs = FakeGcs({f"telegram/{CHANNEL}/result.json": json.dumps(EXPORT).encode()})
    client = app.state.meilisearch_client
    assert await ingest_channel(client, gcs, "bucket", CHANNEL) == 2  # type: ignore[arg-type]
    await search_settled()
    try:
        yield
    finally:
        with contextlib.suppress(Exception):
            await delete_index(client, f"telegram_{CHANNEL}")


async def _search(viewer: Viewer, q: str, **params) -> dict:
    response = await viewer.client.get("/api/search/results", params={"q": q, **params})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.asyncio
@pytest.mark.parametrize("term", ["CSCI 151", "7.222", "Nurgaliyev"])
async def test_a_message_is_found_by_course_code_room_or_surname(
    guest: Viewer, ingested: None, term: str
) -> None:
    body = await _search(guest, term, kind="message")

    assert len(body["results"]) == 1
    assert body["results"][0]["kind"] == "message"
    assert body["counts"]["message"] == 1


@pytest.mark.asyncio
async def test_a_message_result_opens_on_telegram(guest: Viewer, ingested: None) -> None:
    body = await _search(guest, "room")

    (result,) = body["results"]
    assert result["id"] == "telegram_nu_test_channel:101"
    assert result["url"] == f"https://t.me/{CHANNEL}/101"
    assert result["host"] == "t.me"
    assert result["path"] == f"{CHANNEL}/101"
    assert result["date"]["role"] == "posted"
    assert "Aigerim Sadykova" in result["facts"]
    assert "room" in result["snippet"]["text"]


@pytest.mark.asyncio
async def test_service_and_text_less_messages_are_not_searchable(
    guest: Viewer, ingested: None
) -> None:
    assert (await _search(guest, "pin_message"))["results"] == []
    assert (await _search(guest, "Friday"))["results"][0]["id"].endswith(":102")


@pytest.mark.asyncio
async def test_a_missing_export_leaves_the_index_as_it_was(
    app: FastAPI, guest: Viewer, ingested: None, search_settled: Settled
) -> None:
    assert await ingest_channel(app.state.meilisearch_client, FakeGcs({}), "bucket", CHANNEL) == 0  # type: ignore[arg-type]
    await search_settled()

    assert len((await _search(guest, "CSCI 151", kind="message"))["results"]) == 1
