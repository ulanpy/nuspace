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

from backend.modules.courses.registrar.schedule_discovery import (
    discover_latest_term,
    is_term_downgrade,
)
from backend.modules.courses.registrar.schedule_gcs import (
    SCHEDULE_GCS_META_OBJECT,
    SCHEDULE_GCS_OBJECT,
    download_schedule_meta,
    upload_schedule_catalog,
    upload_schedule_meta,
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
    term_label = latest["label"]
    term_id = latest["termid"]
    logger.info("Discovered term %s (termid=%s)", term_label, term_id)

    client = storage.Client(project=project_id)
    existing_meta = download_schedule_meta(client, bucket_name, object_name=meta_object)
    current_term_id = (existing_meta or {}).get("term_id")
    current_term_id = str(current_term_id) if current_term_id is not None else None
    checked_at = datetime.now(timezone.utc).isoformat()

    if is_term_downgrade(term_id, current_term_id):
        skip_meta = {
            **(existing_meta or {}),
            "catalog_object": (existing_meta or {}).get("catalog_object", catalog_object),
            "updated": False,
            "checked_at": checked_at,
        }
        upload_schedule_meta(client, bucket_name, skip_meta, object_name=meta_object)
        logger.info(
            "Skipping upload: discovered termid=%s is older than current termid=%s (updated=false)",
            term_id,
            current_term_id,
        )
        return 0

    pdf_url = (
        "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
        f"&name=school_schedule_by_term&termid={term_id}"
    )
    priority_pdf_url = (
        "https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument"
        f"&name=course_requirements&termid={term_id}"
    )

    logger.info("Parsing schedule PDFs for %s (termid=%s)", term_label, term_id)
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
            "synced_at": checked_at,
            "catalog_object": catalog_object,
            "updated": True,
            "checked_at": checked_at,
        },
    )

    logger.info(
        "Uploaded %s schedule docs to gs://%s/%s (meta: gs://%s/%s, updated=true)",
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
        logger.info("Job finished without uploading catalog")
    raise SystemExit(0)


if __name__ == "__main__":
    main()
