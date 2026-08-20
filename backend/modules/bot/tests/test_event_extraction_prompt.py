from datetime import datetime, timezone

from backend.modules.bot.services.event_extraction_prompt import (
    build_event_extraction_system_prompt,
)


def test_prompt_includes_current_almaty_time_for_relative_dates() -> None:
    prompt = build_event_extraction_system_prompt(
        datetime(2026, 8, 13, 17, 55, tzinfo=timezone.utc)
    )

    assert "current real local time at extraction is 2026-08-13T22:55:00" in prompt
    assert "set start_datetime to\n  2026-08-13T23:00:00+05:00" in prompt
    assert "resolve relative dates such as today, tomorrow, Friday" in prompt


def test_prompt_defines_recruitment_defaults() -> None:
    prompt = build_event_extraction_system_prompt(datetime(2026, 8, 13, 22, 55))

    assert 'set place to "Online"' in prompt
    assert "2026-08-13T23:00:00+05:00" in prompt
    assert "plus 5 minutes" in prompt
    assert "use 23:59:59 local time" in prompt
