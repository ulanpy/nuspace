import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Sequence

import httpx

from backend.modules.courses.registrar.parsers.priority_parser import parse_pdf
from backend.modules.courses.registrar.priority_sync import PRIORITY_PDF_URL


async def main() -> None:
    pdf_url = os.environ.get("PRIORITY_SYNC__PDF_URL", PRIORITY_PDF_URL)
    output_path = os.environ.get("PRIORITY_SYNC__OUTPUT_PATH")

    if not output_path:
        raise SystemExit("PRIORITY_SYNC__OUTPUT_PATH env var is required")

    content = await _download(pdf_url)
    loop = asyncio.get_running_loop()
    documents = await loop.run_in_executor(None, parse_pdf, content)

    Path(output_path).write_text(json.dumps(documents), encoding="utf-8")


async def _download(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, verify=False) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:  # pragma: no cover - surfaced in parent process
        print(f"Priority sync worker failed: {exc}", file=sys.stderr)
        raise


