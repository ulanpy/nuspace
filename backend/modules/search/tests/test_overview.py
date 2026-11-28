"""The AI Overview (#445): the service below the model seam, and the 401 over HTTP."""

import asyncio
import json
import logging
from datetime import date
from types import SimpleNamespace

import pytest

from backend.modules.search import overview
from backend.modules.search.overview import ModelReply, OverviewService
from backend.modules.search.schemas import SearchKind, SearchResult, Snippet, SourceDate
from backend.tests.harness import Viewer

VIEWER_SUB = "viewer-sub-that-must-not-be-logged"
VIEWER = ({"sub": VIEWER_SUB}, {"role": "default"})


def _source(n: int, text: str = "Meets on Fridays.") -> SearchResult:
    return SearchResult(
        id=f"page:{n}",
        kind=SearchKind.page,
        title=f"Club {n}",
        url=f"https://pages.nuspace.kz/club-{n}",
        host="pages.nuspace.kz",
        path=f"club-{n}",
        date=SourceDate(role="updated", value=date(2030, 1, 1)),
        snippet=Snippet(text=text),
    )


class FakeSearch:
    def __init__(self, results: list[SearchResult]) -> None:
        self.results = results

    async def search(self, viewer, **kwargs):
        return SimpleNamespace(results=self.results)


class FakeModel:
    def __init__(self, reply: dict | str | None = None, *, delay: float = 0) -> None:
        self.reply = reply
        self.delay = delay
        self.prompts: list[str] = []

    async def generate(self, prompt: str) -> ModelReply:
        self.prompts.append(prompt)
        await asyncio.sleep(self.delay)
        text = self.reply if isinstance(self.reply, str) else json.dumps(self.reply)
        return ModelReply(text=text, input_tokens=120, output_tokens=30)


async def _run(results: list[SearchResult], model: FakeModel):
    service = OverviewService(FakeSearch(results), model)  # type: ignore[arg-type]
    return await service.overview(VIEWER, query="ai clubs")


THREE = [_source(1), _source(2), _source(3)]


@pytest.mark.asyncio
async def test_below_three_sources_no_model_call():
    model = FakeModel({"answer": "x", "sources": [1]})
    response = await _run([_source(1), _source(2)], model)
    assert response.answer is None
    assert model.prompts == []


@pytest.mark.asyncio
async def test_answer_binds_citations_and_drops_out_of_range():
    model = FakeModel({"answer": "Two clubs meet [1][3].", "sources": [1, 3, 99, 0, 1]})
    response = await _run(THREE, model)
    assert response.answer == "Two clubs meet [1][3]."
    assert [(s.n, s.id, s.url) for s in response.sources] == [
        (1, "page:1", "https://pages.nuspace.kz/club-1"),
        (3, "page:3", "https://pages.nuspace.kz/club-3"),
    ]


@pytest.mark.asyncio
async def test_null_answer_is_an_abstention():
    response = await _run(THREE, FakeModel({"answer": None, "sources": []}))
    assert response.answer is None and response.sources == []


@pytest.mark.asyncio
async def test_sources_are_labelled_data_lines_cropped_to_thirty_words():
    model = FakeModel({"answer": None, "sources": []})
    long_text = " ".join(f"w{i}" for i in range(100))
    await _run([_source(1, long_text), _source(2), _source(3)], model)
    line = next(each for each in model.prompts[0].splitlines() if each.startswith("[1]"))
    assert line.startswith("[1] page · pages.nuspace.kz/club-1 · 2030-01-01 · Club 1 — w0 ")
    assert "w29" in line and "w30" not in line


@pytest.mark.asyncio
async def test_sources_past_the_input_cap_are_dropped_whole(monkeypatch):
    monkeypatch.setattr(
        overview, "INPUT_TOKEN_CAP", overview.estimate_tokens(overview.SYSTEM_PROMPT) + 300
    )
    model = FakeModel({"answer": None, "sources": []})
    await _run([_source(n, "word " * 30) for n in range(1, 11)], model)
    lines = [each for each in model.prompts[0].splitlines() if each.startswith("[")]
    assert 3 <= len(lines) < 10
    assert all(each.endswith("word …") or each.endswith("word") for each in lines)
    assert [each.split()[0] for each in lines] == [f"[{n}]" for n in range(1, len(lines) + 1)]


@pytest.mark.asyncio
async def test_timeout_collapses_to_no_overview(monkeypatch):
    monkeypatch.setattr(overview, "TIMEOUT_SECONDS", 0.05)
    response = await _run(THREE, FakeModel({"answer": "late", "sources": [1]}, delay=1))
    assert response.answer is None


@pytest.mark.asyncio
async def test_bad_model_output_collapses_to_no_overview():
    for reply in ("not json", ""):
        assert (await _run(THREE, FakeModel(reply))).answer is None


@pytest.mark.asyncio
async def test_log_record_carries_no_viewer_id(caplog):
    caplog.set_level(logging.INFO, logger=overview.logger.name)
    await _run(THREE, FakeModel({"answer": "A [1].", "sources": [1]}))
    records = [r for r in caplog.records if r.getMessage().startswith("ai_overview")]
    assert len(records) == 1
    record = records[0]
    assert record.outcome == "answered"
    assert (record.query, record.source_count, record.input_tokens, record.output_tokens) == (
        "ai clubs",
        3,
        120,
        30,
    )
    assert VIEWER_SUB not in repr(record.__dict__)


@pytest.mark.asyncio
async def test_no_call_is_logged(caplog):
    caplog.set_level(logging.INFO, logger=overview.logger.name)
    await _run([_source(1)], FakeModel())
    assert [r.outcome for r in caplog.records if hasattr(r, "outcome")] == ["no_call"]


@pytest.mark.asyncio
async def test_guest_gets_401(guest: Viewer):
    response = await guest.client.get("/api/search/overview", params={"q": "ai"})
    assert response.status_code == 401
