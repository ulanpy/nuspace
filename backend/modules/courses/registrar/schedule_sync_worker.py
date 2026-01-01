import asyncio
import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from typing import Sequence

import httpx

from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf
from backend.modules.courses.registrar.parsers.priority_parser import parse_pdf as parse_priority_pdf
from backend.modules.courses.registrar.schedule_sync import (
    SCHEDULE_PDF_URL,
    _merge_priorities_into_schedule,
)


async def main() -> None:
    pdf_url = os.environ.get("SCHEDULE_SYNC__PDF_URL", SCHEDULE_PDF_URL)
    term_label = os.environ.get("SCHEDULE_SYNC__TERM_LABEL") or None
    term_id = os.environ.get("SCHEDULE_SYNC__TERM_ID") or _extract_term_id(pdf_url)
    priority_pdf_url = os.environ.get("SCHEDULE_SYNC__PRIORITY_PDF_URL") or None
    output_path = os.environ.get("SCHEDULE_SYNC__OUTPUT_PATH")

    if not output_path:
        raise SystemExit("SCHEDULE_SYNC__OUTPUT_PATH env var is required")

    content = await _download(pdf_url)
    try:
        documents = parse_schedule_pdf(content, term_label=term_label, term_id=term_id)
    except Exception as exc:
        print(f"Schedule sync worker failed to parse feed: {exc}", file=sys.stderr)
        # Debug hint: dump first few KB as hex to help inspect headers
        preview_path = Path(output_path + ".preview.txt")
        hex_preview = content[:4096].hex()
        preview_path.write_text(hex_preview, encoding="utf-8")
        raise SystemExit(1)

    if priority_pdf_url:
        priority_docs = await _fetch_priority(priority_pdf_url)
        if priority_docs:
            documents = _merge_priorities_into_schedule(documents, priority_docs)

    Path(output_path).write_text(json.dumps(documents), encoding="utf-8")


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def _fetch_priority(url: str) -> Sequence[dict]:
    try:
        # Priority PDF sometimes has cert issues; disable verify to avoid blocking sync
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
    except Exception as exc:  # pragma: no cover - surfaced in parent process
        print(f"Schedule sync worker failed: {exc}", file=sys.stderr)
        raise