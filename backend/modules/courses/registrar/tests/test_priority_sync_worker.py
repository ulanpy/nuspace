import json
from pathlib import Path

import pytest

from backend.modules.courses.registrar import priority_sync_worker as worker


@pytest.mark.asyncio
async def test_worker_writes_output(tmp_path, monkeypatch):
    monkeypatch.setenv("PRIORITY_SYNC__PDF_URL", "https://example.com/pdf")
    output_path = tmp_path / "priorities.json"
    monkeypatch.setenv("PRIORITY_SYNC__OUTPUT_PATH", str(output_path))

    async def fake_download(url: str) -> bytes:
        assert url == "https://example.com/pdf"
        return b"%PDF-FAKE%"

    monkeypatch.setattr(worker, "_download", fake_download)
    monkeypatch.setattr(worker, "parse_pdf", lambda _: [{"id": 1, "abbr": "MATH 162"}])

    await worker.main()

    assert output_path.exists()
    data = json.loads(output_path.read_text())
    assert data == [{"id": 1, "abbr": "MATH 162"}]


