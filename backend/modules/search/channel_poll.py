"""Poll a public Telegram channel's `t.me/s/<channel>` preview and append new posts to GCS (#444).

Runs in a Cloud Run Job that never touches Postgres or Meilisearch: it reads and
writes GCS only. New posts are merged into the channel's export,
`telegram/<channel>/result.json` (Telegram Desktop's JSON, what #442's ingestion
reads), and the API re-indexes the channel when that object is finalized.

The poller walks backwards from the newest page (`?before=<id>`) until it reaches
the channel's watermark: the highest post id it has seen, kept in
`telegram/<channel>/poll.json`. Normally that is one fetch; after a gap, as many
as the gap was deep. Deletions and edits are seen only on the re-fetched page.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup
from google.cloud import storage

logger = logging.getLogger(__name__)

EXPORT_OBJECT = "telegram/{channel}/result.json"
STATE_OBJECT = "telegram/{channel}/poll.json"
PREVIEW_URL = "https://t.me/s/{channel}"
MAX_PAGES = 50  # a page holds ~20 posts; bounds a first run or a very long gap


class ParseError(Exception):
    """The page is not the `t.me/s/` layout the parser knows."""


def parse_page(channel: str, html: str) -> list[dict[str, Any]]:
    """The posts on one preview page, as export messages. Raises ParseError on a foreign layout."""
    soup = BeautifulSoup(html, "html.parser")
    posts: list[dict[str, Any]] = []
    for node in soup.select("div.tgme_widget_message[data-post]"):
        post_ref = str(node.get("data-post", ""))
        match = re.fullmatch(rf"{re.escape(channel)}/(\d+)", post_ref, flags=re.IGNORECASE)
        time_tag = node.select_one(".tgme_widget_message_date time[datetime]")
        if match is None or time_tag is None:
            raise ParseError(f"message {post_ref!r} has no id or date")
        text_node = node.select_one(".tgme_widget_message_text")
        text = ""
        if text_node is not None:
            for br in text_node.find_all("br"):
                br.replace_with("\n")
            text = text_node.get_text().strip()
        author = node.select_one(".tgme_widget_message_from_author")
        posts.append(
            {
                "id": int(match.group(1)),
                "type": "message",
                "date": str(time_tag["datetime"]),
                "from": author.get_text().strip() if author else None,
                "text": text,
            }
        )
    return posts


async def fetch_new_posts(
    http: httpx.AsyncClient, channel: str, watermark: int, *, max_pages: int = MAX_PAGES
) -> list[dict[str, Any]]:
    """Posts newer than `watermark`, newest page first, stopping once a page reaches it."""
    new: dict[int, dict[str, Any]] = {}
    before: int | None = None
    for _ in range(max_pages):
        response = await http.get(
            PREVIEW_URL.format(channel=channel), params={"before": before} if before else None
        )
        response.raise_for_status()
        posts = parse_page(channel, response.text)
        if not posts:
            if before is None:
                raise ParseError(f"first page of {channel} holds no posts")
            break  # walked past the oldest post
        for post in posts:
            if post["id"] > watermark:
                new[post["id"]] = post
        oldest = min(post["id"] for post in posts)
        if oldest <= watermark or oldest <= 1:
            break
        before = oldest
    return sorted(new.values(), key=lambda post: post["id"])


def _download_json(
    storage_client: storage.Client, bucket_name: str, object_name: str
) -> dict[str, Any] | None:
    blob = storage_client.bucket(bucket_name).blob(object_name)
    if not blob.exists():
        return None
    data = json.loads(blob.download_as_bytes().decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"gs://{bucket_name}/{object_name} is not a JSON object")
    return data


def _upload_json(
    storage_client: storage.Client, bucket_name: str, object_name: str, data: dict[str, Any]
) -> None:
    storage_client.bucket(bucket_name).blob(object_name).upload_from_string(
        json.dumps(data, ensure_ascii=False), content_type="application/json"
    )


async def poll_channel(
    http: httpx.AsyncClient, storage_client: storage.Client, bucket_name: str, channel: str
) -> int:
    """Append the channel's new posts to its export in GCS. Returns how many were added."""
    export_object = EXPORT_OBJECT.format(channel=channel)
    state_object = STATE_OBJECT.format(channel=channel)
    export = _download_json(storage_client, bucket_name, export_object) or {
        "name": channel,
        "type": "public_channel",
        "messages": [],
    }
    messages = [m for m in export.get("messages") or [] if isinstance(m, dict)]
    state = _download_json(storage_client, bucket_name, state_object) or {}
    exported_ids = [m["id"] for m in messages if isinstance(m.get("id"), int)]
    watermark = max([int(state.get("watermark") or 0), *exported_ids])

    new_posts = await fetch_new_posts(http, channel, watermark)
    if new_posts:
        export["messages"] = messages + new_posts
        _upload_json(storage_client, bucket_name, export_object, export)  # triggers the re-index
        watermark = new_posts[-1]["id"]
    _upload_json(
        storage_client,
        bucket_name,
        state_object,
        {"watermark": watermark, "checked_at": datetime.now(timezone.utc).isoformat()},
    )
    logger.info("Channel %s: %d new posts, watermark %d", channel, len(new_posts), watermark)
    return len(new_posts)
