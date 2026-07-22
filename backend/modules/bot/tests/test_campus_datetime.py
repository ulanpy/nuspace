from datetime import datetime, timezone

import pytest

from backend.common.datetime_utils import almaty_to_utc
from backend.modules.bot.schemas.event_post import ExtractedEventDraft


@pytest.mark.parametrize(
    ("raw", "expected_utc"),
    [
        ("2026-08-29T19:00:00", datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc)),
        ("2026-08-29T19:00:00+05:00", datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc)),
        ("2026-08-29T14:00:00Z", datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc)),
    ],
)
def test_extracted_event_draft_normalizes_to_utc(raw: str, expected_utc: datetime) -> None:
    draft = ExtractedEventDraft(start_datetime=raw, end_datetime=raw)
    assert draft.start_datetime == expected_utc
    assert draft.end_datetime == expected_utc


def test_almaty_to_utc_naive() -> None:
    naive = datetime(2026, 8, 29, 19, 0)
    assert almaty_to_utc(naive) == datetime(2026, 8, 29, 14, 0, tzinfo=timezone.utc)
