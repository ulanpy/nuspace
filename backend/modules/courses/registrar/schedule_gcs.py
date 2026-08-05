"""GCS artifact paths and helpers for the registrar schedule catalog."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Sequence

from google.cloud import storage

logger = logging.getLogger(__name__)

SCHEDULE_GCS_OBJECT = "registrar/course_schedule_catalog.json"
SCHEDULE_GCS_META_OBJECT = "registrar/meta.json"

FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "registrar"
SCHEDULE_FIXTURE_CATALOG = FIXTURES_DIR / "course_schedule_catalog.json"
SCHEDULE_FIXTURE_META = FIXTURES_DIR / "meta.json"


def load_local_schedule_catalog_fixture() -> list[dict] | None:
    """
    Load committed registrar schedule JSON for local debug (IS_DEBUG=true).

    Returns None if the fixture file is missing or invalid.
    """
    if not SCHEDULE_FIXTURE_CATALOG.is_file():
        logger.info("Local schedule fixture not found at %s", SCHEDULE_FIXTURE_CATALOG)
        return None

    try:
        raw = SCHEDULE_FIXTURE_CATALOG.read_text(encoding="utf-8")
        data = json.loads(raw)
    except Exception:
        logger.exception("Failed to read local schedule fixture at %s", SCHEDULE_FIXTURE_CATALOG)
        return None

    if not isinstance(data, list):
        logger.error("Local schedule fixture at %s is not a JSON list", SCHEDULE_FIXTURE_CATALOG)
        return None

    if SCHEDULE_FIXTURE_META.is_file():
        logger.info("Using local schedule fixture meta from %s", SCHEDULE_FIXTURE_META)
    else:
        logger.info("Local schedule fixture meta missing at %s", SCHEDULE_FIXTURE_META)

    return data


def download_schedule_meta(
    storage_client: storage.Client,
    bucket_name: str,
    *,
    object_name: str = SCHEDULE_GCS_META_OBJECT,
) -> dict | None:
    """Return existing meta.json dict, or None if missing/unreadable."""
    try:
        blob = storage_client.bucket(bucket_name).blob(object_name)
        if not blob.exists():
            return None
        data = json.loads(blob.download_as_bytes().decode("utf-8"))
    except Exception:
        logger.exception("Failed to download schedule meta from gs://%s/%s", bucket_name, object_name)
        return None
    return data if isinstance(data, dict) else None


def upload_schedule_meta(
    storage_client: storage.Client,
    bucket_name: str,
    meta: dict,
    *,
    object_name: str = SCHEDULE_GCS_META_OBJECT,
) -> None:
    """Write meta.json only (does not touch the catalog artifact)."""
    blob = storage_client.bucket(bucket_name).blob(object_name)
    blob.upload_from_string(json.dumps(meta, ensure_ascii=False), content_type="application/json")


def download_schedule_catalog(
    storage_client: storage.Client,
    bucket_name: str,
    *,
    object_name: str = SCHEDULE_GCS_OBJECT,
) -> list[dict] | None:
    """
    Download parsed schedule documents from GCS.

    Returns None if the object is missing or unreadable (caller should abort).
    Returns [] if the object exists but contains an empty list.
    """
    try:
        blob = storage_client.bucket(bucket_name).blob(object_name)
        if not blob.exists():
            logger.warning("GCS object gs://%s/%s does not exist", bucket_name, object_name)
            return None
        raw = blob.download_as_bytes()
        data = json.loads(raw.decode("utf-8"))
    except Exception:
        logger.exception(
            "Failed to download schedule catalog from gs://%s/%s", bucket_name, object_name
        )
        return None

    if not isinstance(data, list):
        logger.error(
            "Schedule catalog GCS object gs://%s/%s is not a JSON list",
            bucket_name,
            object_name,
        )
        return None

    return data


def upload_schedule_catalog(
    storage_client: storage.Client,
    bucket_name: str,
    documents: Sequence[dict],
    *,
    catalog_object: str = SCHEDULE_GCS_OBJECT,
    meta_object: str = SCHEDULE_GCS_META_OBJECT,
    meta: dict | None = None,
) -> None:
    """Upload catalog JSON and optional meta sidecar. Caller must ensure documents non-empty."""
    bucket = storage_client.bucket(bucket_name)
    catalog_blob = bucket.blob(catalog_object)
    catalog_blob.upload_from_string(
        json.dumps(list(documents), ensure_ascii=False),
        content_type="application/json",
    )
    if meta is not None:
        meta_blob = bucket.blob(meta_object)
        meta_blob.upload_from_string(
            json.dumps(meta, ensure_ascii=False),
            content_type="application/json",
        )
