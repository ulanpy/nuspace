"""Minimal iCalendar (.ics) serialization for student schedule events."""

from datetime import datetime, timezone


def ics_escape_text(value: str) -> str:
    """Escape TEXT values per RFC 5545."""
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
        .replace("\r", "\\n")
    )


def ics_local_datetime(iso_value: str) -> str:
    """Convert an ISO datetime string to floating local form YYYYMMDDTHHMMSS."""
    dt = datetime.fromisoformat(iso_value)
    return dt.strftime("%Y%m%dT%H%M%S")


def events_to_ics(events: list[dict]) -> str:
    """Serialize Google-shaped event dicts into a minimal iCalendar document."""
    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NUspace//Student Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-TIMEZONE:Asia/Almaty",
    ]
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    for event in events:
        private = (event.get("extendedProperties") or {}).get("private") or {}
        event_key = private.get("nuros_event_key") or private.get("course_code") or "event"
        uid = f"{event_key}@nuspace"

        start = (event.get("start") or {}).get("dateTime") or ""
        end = (event.get("end") or {}).get("dateTime") or ""
        summary = event.get("summary") or ""
        # Google export stores literal "\n" sequences in description.
        description = (event.get("description") or "").replace("\\n", "\n")
        location = event.get("location") or ""

        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{stamp}",
                f"DTSTART;TZID=Asia/Almaty:{ics_local_datetime(start)}",
                f"DTEND;TZID=Asia/Almaty:{ics_local_datetime(end)}",
            ]
        )
        for rule in event.get("recurrence") or []:
            lines.append(rule)
        lines.extend(
            [
                f"SUMMARY:{ics_escape_text(summary)}",
                f"DESCRIPTION:{ics_escape_text(description)}",
                f"LOCATION:{ics_escape_text(location)}",
                "END:VEVENT",
            ]
        )

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"
