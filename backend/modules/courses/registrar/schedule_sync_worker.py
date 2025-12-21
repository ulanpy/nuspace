import asyncio
import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx

from backend.modules.courses.registrar.parsers.schedule_pdf_parser import parse_schedule_pdf
from backend.modules.courses.registrar.schedule_sync import SCHEDULE_PDF_URL


async def main() -> None:
    pdf_url = os.environ.get("SCHEDULE_SYNC__PDF_URL", SCHEDULE_PDF_URL)
    term_label = os.environ.get("SCHEDULE_SYNC__TERM_LABEL") or None
    term_id = os.environ.get("SCHEDULE_SYNC__TERM_ID") or _extract_term_id(pdf_url)
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

    Path(output_path).write_text(json.dumps(documents), encoding="utf-8")


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


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

async def main() -> None:
    pdf_url = os.environ.get("SCHEDULE_SYNC__PDF_URL", SCHEDULE_PDF_URL)
    term_label = os.environ.get("SCHEDULE_SYNC__TERM_LABEL")
    term_id = os.environ.get("SCHEDULE_SYNC__TERM_ID") or _extract_term_id(pdf_url)
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

    Path(output_path).write_text(json.dumps(documents), encoding="utf-8")


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


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


