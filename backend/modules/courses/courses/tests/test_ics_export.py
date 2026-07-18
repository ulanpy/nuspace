import importlib.util
from pathlib import Path

ICS_PATH = Path(__file__).resolve().parents[1] / "ics_export.py"
spec = importlib.util.spec_from_file_location("ics_export", ICS_PATH)
ics_export = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(ics_export)

events_to_ics = ics_export.events_to_ics
ics_escape_text = ics_export.ics_escape_text


def test_ics_escape_text_escapes_special_chars() -> None:
    assert ics_escape_text("A;B,C\\D\nE") == "A\\;B\\,C\\\\D\\nE"


def test_events_to_ics_builds_vevent() -> None:
    ics = events_to_ics(
        [
            {
                "summary": "CSCI 151 — Programming",
                "description": "Lecture\\nRoom A",
                "location": "7.105",
                "start": {"dateTime": "2026-01-13T10:30:00+05:00", "timeZone": "Asia/Almaty"},
                "end": {"dateTime": "2026-01-13T11:45:00+05:00", "timeZone": "Asia/Almaty"},
                "recurrence": [
                    "RRULE:FREQ=WEEKLY;UNTIL=20260515T064500Z",
                ],
                "extendedProperties": {
                    "private": {
                        "nuros_event_key": "CSCI151-0-1030-1145",
                        "term_value": "2026S",
                    }
                },
            }
        ]
    )

    assert ics.startswith("BEGIN:VCALENDAR\r\n")
    assert "BEGIN:VEVENT\r\n" in ics
    assert "UID:CSCI151-0-1030-1145@nuspace\r\n" in ics
    assert "DTSTART;TZID=Asia/Almaty:20260113T103000\r\n" in ics
    assert "DTEND;TZID=Asia/Almaty:20260113T114500\r\n" in ics
    assert "RRULE:FREQ=WEEKLY;UNTIL=20260515T064500Z\r\n" in ics
    assert "SUMMARY:CSCI 151 — Programming\r\n" in ics
    assert "DESCRIPTION:Lecture\\nRoom A\r\n" in ics
    assert "LOCATION:7.105\r\n" in ics
    assert ics.endswith("END:VCALENDAR\r\n")
