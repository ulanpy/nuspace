"""Unit tests for registrar term discovery helpers."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.modules.courses.registrar.schedule_discovery import (
    _TERM_PATTERN,
    _normalize_html,
    discover_latest_term,
    is_term_downgrade,
)


@pytest.mark.parametrize(
    ("discovered", "current", "expected"),
    [
        ("824", "825", True),
        ("825", "825", False),
        ("825", "824", False),
        ("824", None, False),
        ("824", "", False),
        ("x", "825", False),
    ],
)
def test_is_term_downgrade(discovered, current, expected) -> None:
    assert is_term_downgrade(discovered, current) is expected


def test_normalize_html_nbsp_lets_fall_match() -> None:
    raw = (
        "Course schedules for Fall&nbsp;2026 "
        '(<a href="https://registrar.nu.edu.kz/x?termid=825">pdf</a>)'
        "Course schedules for Summer 2026 "
        '(<a href="https://registrar.nu.edu.kz/x?termid=824">pdf</a>)'
    )
    raw_labels = {m.group("label") for m in _TERM_PATTERN.finditer(raw)}
    assert "Fall 2026" not in raw_labels

    text = _normalize_html(raw)
    labels = {m.group("label"): m.group("termid") for m in _TERM_PATTERN.finditer(text)}
    assert labels["Fall 2026"] == "825"
    assert labels["Summer 2026"] == "824"


@pytest.mark.asyncio
async def test_discover_latest_term_prefers_nbsp_fall_over_summer() -> None:
    schedules = """
    <div>Course schedules for Fall&nbsp;2026&nbsp;(
    <a href="https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument&amp;name=school_schedule_by_term&amp;termid=825">pdf</a>)
    </div>
    <div>Course schedules for Summer 2026&nbsp;(
    <a href="https://registrar.nu.edu.kz/registrar_downloads/json?method=printDocument&amp;name=school_schedule_by_term&amp;termid=824">pdf</a>)
    </div>
    """
    requirements = "<div>Course requirements for Fall&nbsp;2025 termid=822</div>"

    responses = [
        MagicMock(text=schedules, raise_for_status=MagicMock()),
        MagicMock(text=requirements, raise_for_status=MagicMock()),
    ]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=responses)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)

    with patch(
        "backend.modules.courses.registrar.schedule_discovery.httpx.AsyncClient",
        return_value=mock_client,
    ):
        latest = await discover_latest_term()

    assert latest["termid"] == "825"
    assert latest["label"] == "Fall 2026"
