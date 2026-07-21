"""
Cloud Run Job entrypoint: discover registrar PDFs, parse, upload JSON to GCS.

Does not touch Meilisearch. FastAPI pulls the artifact and reindexes.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

from google.cloud import storage

from backend.modules.courses.registrar.schedule_discovery import discover_latest_term
from backend.modules.courses.registrar.schedule_gcs import (
    SCHEDULE_GCS_META_OBJECT,
    SCHEDULE_GCS_OBJECT,
    upload_schedule_catalog,
)
from backend.modules.courses.registrar.schedule_sync_worker import build_schedule_documents

logger = logging.getLogger(__name__)


def _require_env(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise SystemExit(f"{name} env var is required")
    return value


async def run() -> int:
    bucket_name = _require_env("BUCKET_NAME")
    project_id = os.environ.get("GCP_PROJECT_ID") or None
    catalog_object = os.environ.get("SCHEDULE_SYNC_GCS_OBJECT", SCHEDULE_GCS_OBJECT)
    meta_object = os.environ.get("SCHEDULE_SYNC_GCS_META_OBJECT", SCHEDULE_GCS_META_OBJECT)

    latest = await discover_latest_term()
    pdf_url = (
        "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
        f"&name=school_schedule_by_term&termid={latest['termid']}"
    )
    priority_pdf_url = (
        "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
        f"&name=course_requirements&termid={latest['termid']}"
    )
    term_label = latest["label"]
    term_id = latest["termid"]

    logger.info("Discovered term %s (termid=%s); parsing schedule PDFs", term_label, term_id)
    documents = await build_schedule_documents(
        pdf_url=pdf_url,
        term_label=term_label,
        term_id=term_id,
        priority_pdf_url=priority_pdf_url,
    )

    if not documents:
        logger.warning(
            "Schedule sync job produced 0 documents; not overwriting GCS artifact "
            "(source PDF may be unavailable for term %s)",
            term_label,
        )
        return 0

    client = storage.Client(project=project_id)
    upload_schedule_catalog(
        client,
        bucket_name,
        documents,
        catalog_object=catalog_object,
        meta_object=meta_object,
        meta={
            "term_id": term_id,
            "term_label": term_label,
            "doc_count": len(documents),
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "catalog_object": catalog_object,
        },
    )

    logger.info(
        "Uploaded %s schedule docs to gs://%s/%s (meta: gs://%s/%s)",
        len(documents),
        bucket_name,
        catalog_object,
        bucket_name,
        meta_object,
    )
    return len(documents)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stdout,
    )
    try:
        count = asyncio.run(run())
    except Exception:
        logger.exception("Schedule sync job failed")
        raise SystemExit(1) from None
    if count == 0:
        logger.info("Job finished without uploading (empty parse result)")
    raise SystemExit(0)


if __name__ == "__main__":
    main()
