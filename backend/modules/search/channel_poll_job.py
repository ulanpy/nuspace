"""Cloud Run Job entrypoint: poll Telegram channels' public previews, append to GCS (#444).

Does not touch Postgres or Meilisearch. FastAPI re-indexes a channel when its
export object is finalized. A page the parser cannot read alerts the team on
Telegram and fails the job.
"""

import asyncio
import logging
import os
import sys

import httpx
from google.cloud import storage

from backend.modules.search.channel_poll import ParseError, poll_channel

logger = logging.getLogger(__name__)


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"{name} env var is required")
    return value


async def send_alert(text: str) -> None:
    """Tell the team on Telegram. Best effort: the job's failure is the backstop."""
    token, chat_id = os.environ.get("TELEGRAM_BOT_TOKEN"), os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        logger.error("Telegram alert not configured; dropping: %s", text)
        return
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text},
            )
    except Exception:
        logger.exception("Failed to send Telegram alert")


async def run(http: httpx.AsyncClient | None = None, storage_client: storage.Client | None = None) -> int:
    """Poll every configured channel. Returns how many channels failed."""
    bucket_name = _require_env("BUCKET_NAME")
    channels = [c.strip() for c in _require_env("TELEGRAM_POLL_CHANNELS").split(",") if c.strip()]
    storage_client = storage_client or storage.Client(project=os.environ.get("GCP_PROJECT_ID") or None)
    failures = 0
    owned = http is None
    http = http or httpx.AsyncClient(timeout=30, follow_redirects=True)
    try:
        for channel in channels:
            try:
                await poll_channel(http, storage_client, bucket_name, channel)
            except ParseError as exc:
                failures += 1
                logger.exception("Channel %s: preview page did not parse", channel)
                await send_alert(f"Telegram channel poll: cannot parse t.me/s/{channel}: {exc}")
            except Exception:
                failures += 1
                logger.exception("Channel %s: poll failed", channel)
    finally:
        if owned:
            await http.aclose()
    return failures


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    raise SystemExit(1 if asyncio.run(run()) else 0)


if __name__ == "__main__":
    main()
