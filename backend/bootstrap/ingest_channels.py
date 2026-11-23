"""Ingest Telegram channel exports from GCS into their search indexes, on request.

    python -m backend.bootstrap.ingest_channels <channel> [<channel> ...]

Each channel's export is read from `telegram/<channel>/result.json` in the
bucket. Uploading it is a separate, manual step.
"""

import argparse
import asyncio
import os
import sys

from google.cloud import storage

from backend.bootstrap.meilisearch import create_meilisearch_client
from backend.core.configs.config import config
from backend.modules.search.channel_messages import ingest_channel


async def run(channels: list[str]) -> dict[str, int]:
    if config.USE_GCS_EMULATOR:
        os.environ["STORAGE_EMULATOR_HOST"] = config.GCS_EMULATOR_HOST
        storage_client = storage.Client(project="dev")
    else:
        storage_client = storage.Client(project=config.GCP_PROJECT_ID)
    client = create_meilisearch_client()
    try:
        return {
            channel: await ingest_channel(client, storage_client, config.BUCKET_NAME, channel)
            for channel in channels
        }
    finally:
        await client.aclose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Ingest Telegram channel exports from GCS.")
    parser.add_argument("channels", nargs="+", help="Channel usernames, without the @.")
    args = parser.parse_args(argv)
    for channel, count in asyncio.run(run(args.channels)).items():
        print(f"{channel}: {count} messages")
    return 0


if __name__ == "__main__":
    sys.exit(main())
