"""Unit tests for GCS schedule catalog helpers (no real GCP)."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

from backend.modules.courses.registrar.schedule_gcs import (
    SCHEDULE_GCS_OBJECT,
    download_schedule_catalog,
    load_local_schedule_catalog_fixture,
    upload_schedule_catalog,
)
from backend.modules.courses.registrar.schedule_sync import _merge_priorities_into_schedule


def test_load_local_schedule_catalog_fixture_reads_committed_file():
    docs = load_local_schedule_catalog_fixture()
    assert docs is not None
    assert len(docs) > 0
    assert "course_code" in docs[0]


def test_download_missing_object_returns_none():
    blob = MagicMock()
    blob.exists.return_value = False
    bucket = MagicMock()
    bucket.blob.return_value = blob
    client = MagicMock()
    client.bucket.return_value = bucket

    assert download_schedule_catalog(client, "bucket") is None
    bucket.blob.assert_called_once_with(SCHEDULE_GCS_OBJECT)


def test_download_valid_list():
    docs = [{"id": "1", "course_code": "CSCI 111"}]
    blob = MagicMock()
    blob.exists.return_value = True
    blob.download_as_bytes.return_value = json.dumps(docs).encode("utf-8")
    bucket = MagicMock()
    bucket.blob.return_value = blob
    client = MagicMock()
    client.bucket.return_value = bucket

    assert download_schedule_catalog(client, "bucket") == docs


def test_download_non_list_returns_none():
    blob = MagicMock()
    blob.exists.return_value = True
    blob.download_as_bytes.return_value = b'{"not": "a list"}'
    bucket = MagicMock()
    bucket.blob.return_value = blob
    client = MagicMock()
    client.bucket.return_value = bucket

    assert download_schedule_catalog(client, "bucket") is None


def test_upload_writes_catalog_and_meta():
    catalog_blob = MagicMock()
    meta_blob = MagicMock()
    bucket = MagicMock()

    def _blob(name):
        return catalog_blob if name.endswith("catalog.json") else meta_blob

    bucket.blob.side_effect = _blob
    client = MagicMock()
    client.bucket.return_value = bucket

    docs = [{"id": "1"}]
    meta = {"doc_count": 1}
    upload_schedule_catalog(
        client,
        "bucket",
        docs,
        catalog_object="registrar/course_schedule_catalog.json",
        meta_object="registrar/meta.json",
        meta=meta,
    )

    catalog_blob.upload_from_string.assert_called_once()
    meta_blob.upload_from_string.assert_called_once()
    raw = catalog_blob.upload_from_string.call_args[0][0]
    assert json.loads(raw) == docs


def test_merge_priorities_into_schedule():
    schedule = [{"course_code": "CSCI 111"}, {"course_code": "MATH 101"}]
    priorities = [{"abbr": "CSCI111", "prerequisite": "X", "priority_1": "P1"}]
    merged = _merge_priorities_into_schedule(schedule, priorities)
    assert merged[0]["prerequisite"] == "X"
    assert merged[0]["priority_1"] == "P1"
    assert "prerequisite" not in merged[1]
