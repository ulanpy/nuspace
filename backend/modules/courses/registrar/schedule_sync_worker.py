"""
Parse registrar schedule + priority PDFs into document list.

Used by the Cloud Run Job (and kept as a callable module for local debugging).
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Sequence
from urllib.parse import parse_qs, urlparse

import httpx

from backend.modules.courses.registrar.parsers.priority_parser import parse_pdf as parse_priority_pdf
from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf
from backend.modules.courses.registrar.schedule_sync import (
    SCHEDULE_PDF_URL,
    _merge_priorities_into_schedule,
)


async def build_schedule_documents(
    *,
    pdf_url: str,
    term_label: str | None,
    term_id: str | None,
    priority_pdf_url: str | None,
) -> Sequence[dict]:
    content = await _download(pdf_url)
    documents = parse_schedule_pdf(content, term_label=term_label, term_id=term_id)

    if priority_pdf_url:
        priority_docs = await _fetch_priority(priority_pdf_url)
        if priority_docs:
            documents = _merge_priorities_into_schedule(documents, priority_docs)

    return documents


async def main() -> None:
    """CLI: write parsed documents to SCHEDULE_SYNC__OUTPUT_PATH (local debug)."""
    pdf_url = os.environ.get("SCHEDULE_SYNC__PDF_URL", SCHEDULE_PDF_URL)
    term_label = os.environ.get("SCHEDULE_SYNC__TERM_LABEL") or None
    term_id = os.environ.get("SCHEDULE_SYNC__TERM_ID") or _extract_term_id(pdf_url or "")
    priority_pdf_url = os.environ.get("SCHEDULE_SYNC__PRIORITY_PDF_URL") or None
    output_path = os.environ.get("SCHEDULE_SYNC__OUTPUT_PATH")

    if not output_path:
        raise SystemExit("SCHEDULE_SYNC__OUTPUT_PATH env var is required")
    if not pdf_url:
        raise SystemExit("SCHEDULE_SYNC__PDF_URL env var is required")

    try:
        documents = await build_schedule_documents(
            pdf_url=pdf_url,
            term_label=term_label,
            term_id=term_id,
            priority_pdf_url=priority_pdf_url,
        )
    except Exception as exc:
        print(f"Schedule sync worker failed to parse feed: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc

    Path(output_path).write_text(json.dumps(list(documents)), encoding="utf-8")


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def _fetch_priority(url: str) -> Sequence[dict]:
    try:
        async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        return parse_priority_pdf(resp.content)
    except Exception as exc:
        print(f"Schedule sync worker failed to fetch/parse priority PDF: {exc}", file=sys.stderr)
        return []


def _extract_term_id(url: str) -> str | None:
    try:
        qs = parse_qs(urlparse(url).query)
        return qs.get("termid", [None])[0]
    except Exception:
        return None


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:  # pragma: no cover
        print(f"Schedule sync worker failed: {exc}", file=sys.stderr)
        raise
