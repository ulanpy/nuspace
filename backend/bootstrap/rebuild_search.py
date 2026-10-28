"""Rebuild the Meilisearch indexes from Postgres, on request.

    python -m backend.bootstrap.rebuild_search [--batch-size N] [--skip-catalog]

On the VM, from the directory holding the compose file:

    docker compose -f prod.docker-compose.yml exec fastapi \
        /nuros/backend/.venv/bin/python -m backend.bootstrap.rebuild_search

The app never does this at startup: the indexes live on a persistent volume and
are kept current by upserts and deletes at write time. Run it once after the
volume is first attached (it starts empty), after a bulk change made behind the
application's back (SQL, restore from backup), or after Meilisearch data is lost.

Each table-backed index is built next to the live one and swapped in, so search
keeps working throughout. A write made while an index is being built goes to the
live copy, which the swap then replaces: run it while writes are quiet, or run it
again afterwards. The registrar schedule catalog is not in Postgres, so
it is re-pulled from GCS unless ``--skip-catalog`` is given.
"""

import argparse
import asyncio
import sys

from backend.bootstrap.meilisearch import create_meilisearch_client, rebuild_indexes
from backend.bootstrap.search_indexes import ALL_MEILISEARCH_INDEXES
from backend.common.utils import meilisearch
from backend.core.database.manager import AsyncDatabaseManager
from backend.modules.courses.registrar.startup import rebuild_schedule_catalog


async def run(*, batch_size: int, include_catalog: bool) -> dict[str, int]:
    db_manager = AsyncDatabaseManager()
    client = create_meilisearch_client()
    try:
        counts = await rebuild_indexes(
            client, db_manager, ALL_MEILISEARCH_INDEXES, batch_size=batch_size
        )
        if include_catalog:
            counts["course_schedule_catalog"] = await rebuild_schedule_catalog(client)
        return counts
    finally:
        await client.aclose()
        await db_manager.async_engine.dispose()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Rebuild the Meilisearch indexes from Postgres (and the schedule catalog from GCS)."
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=meilisearch.DEFAULT_BATCH_SIZE,
        help="Rows read from Postgres and sent to Meilisearch per request.",
    )
    parser.add_argument(
        "--skip-catalog",
        action="store_true",
        help="Do not re-pull the registrar schedule catalog from GCS.",
    )
    args = parser.parse_args(argv)

    counts = asyncio.run(run(batch_size=args.batch_size, include_catalog=not args.skip_catalog))
    for uid, count in counts.items():
        print(f"{uid}: {count} documents")
    return 0


if __name__ == "__main__":
    sys.exit(main())
