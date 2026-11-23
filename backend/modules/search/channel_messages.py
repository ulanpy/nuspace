"""Telegram channel messages, ingested from a channel's export in GCS (#442).

GCS is the durable record of message text: a channel's index is rebuilt from its
export, never from Postgres. The ingester does not care how the bytes arrived (a
hand-uploaded Telegram export today, the poller's output later). It reads
`telegram/<channel>/result.json` (Telegram Desktop's export format) and swaps a
freshly built index in, so search keeps answering from the old one meanwhile.

A message contributes its text or caption, channel, date, nullable author and
permalink `t.me/<channel>/<id>`. Attachments are neither exported nor indexed.
"""

import json
import logging
from collections.abc import Iterable, Iterator
from typing import Any

import httpx
from google.cloud import storage

from backend.bootstrap.meilisearch import delete_index, ensure_index
from backend.common.utils import meilisearch
from backend.modules.search.sources import channel_index_uid

logger = logging.getLogger(__name__)

EXPORT_OBJECT = "telegram/{channel}/result.json"
TELEGRAM_ORIGIN = "https://t.me"


def permalink(channel: str, message_id: int) -> str:
    return f"{TELEGRAM_ORIGIN}/{channel}/{message_id}"


class _ChannelIndexSettings:
    """What `ensure_index` reads of an index's configuration."""

    def get_primary_key_name(self) -> str:
        return "id"

    def get_settings(self) -> dict[str, Any]:
        # Only the text is matched; the rest is stored to be shown.
        return {"searchableAttributes": ["text"]}


def _plain_text(text: Any) -> str:
    """A message's `text`: a string, or a list of strings and `{type, text}` entities."""
    if isinstance(text, str):
        return text
    if isinstance(text, list):
        return "".join(
            part if isinstance(part, str) else str(part.get("text", ""))
            for part in text
            if isinstance(part, (str, dict))
        )
    return ""


def message_documents(channel: str, export: dict[str, Any]) -> Iterator[dict[str, Any]]:
    """The index documents of a parsed export. Service and text-less messages have none."""
    for message in export.get("messages") or []:
        if message.get("type") != "message" or not isinstance(message.get("id"), int):
            continue
        text = _plain_text(message.get("text")).strip()
        if not text or not message.get("date"):
            continue
        yield {
            "id": message["id"],
            "text": text,
            "channel": channel,
            "date": message["date"],
            "author": message.get("from") or None,
            "permalink": permalink(channel, message["id"]),
        }


def download_export(
    storage_client: storage.Client, bucket_name: str, channel: str
) -> dict[str, Any] | None:
    """The channel's export, or None if it is missing or unreadable."""
    object_name = EXPORT_OBJECT.format(channel=channel)
    try:
        blob = storage_client.bucket(bucket_name).blob(object_name)
        if not blob.exists():
            logger.warning("GCS object gs://%s/%s does not exist", bucket_name, object_name)
            return None
        data = json.loads(blob.download_as_bytes().decode("utf-8"))
    except Exception:
        logger.exception("Failed to download gs://%s/%s", bucket_name, object_name)
        return None
    if not isinstance(data, dict):
        logger.error("gs://%s/%s is not a Telegram export", bucket_name, object_name)
        return None
    return data


def _batches(documents: Iterable[dict], size: int) -> Iterator[list[dict]]:
    batch: list[dict] = []
    for document in documents:
        batch.append(document)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


async def ingest_channel(
    meilisearch_client: httpx.AsyncClient,
    storage_client: storage.Client,
    bucket_name: str,
    channel: str,
    *,
    batch_size: int = meilisearch.DEFAULT_BATCH_SIZE,
) -> int:
    """Replace the channel's index with its export. Returns the messages indexed.

    0 means the export was missing, unreadable or held no messages, and the index
    was left as it was.
    """
    export = download_export(storage_client, bucket_name, channel)
    if export is None:
        return 0
    documents = list(message_documents(channel, export))
    if not documents:
        logger.warning("Export of channel %s holds no messages; index left as it was", channel)
        return 0

    live_uid = channel_index_uid(channel)
    staging_uid = f"{live_uid}__rebuild"
    index = _ChannelIndexSettings()
    await ensure_index(meilisearch_client, index, uid=live_uid)  # the swap needs both sides
    await delete_index(meilisearch_client, staging_uid)  # a previous run may have died mid-way
    await ensure_index(meilisearch_client, index, uid=staging_uid)
    try:
        for batch in _batches(documents, batch_size):
            response = await meilisearch_client.post(f"/indexes/{staging_uid}/documents", json=batch)
            await meilisearch.wait_for_task(meilisearch_client, response)
        response = await meilisearch_client.post(
            "/swap-indexes", json=[{"indexes": [live_uid, staging_uid]}]
        )
        await meilisearch.wait_for_task(meilisearch_client, response)
    finally:
        await delete_index(meilisearch_client, staging_uid)
    return len(documents)
