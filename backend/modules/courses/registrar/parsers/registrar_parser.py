import io
import re
from html import unescape
from typing import Any

import pdfplumber
from backend.modules.courses.registrar.schemas import ScheduleResponse

COLORS = [
    "#DA3A2D",
    "#EC804F",
    "#ECC059",
    "#7BCA8F",
    "#65A6DA",
    "#9060EE",
    "#3F51B5",
    "#8E24AA",
    "#616161",
]

WEEKDAYS = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
]

COURSE_CODE_SEARCH_PATTERN = re.compile(
    r"(?P<codes>[A-Z]{2,}\s*\d{2,}[A-Z]?(?:\s*/\s*[A-Z]{2,}\s*\d{2,}[A-Z]?)*)(?:\s+|$)"
)


def parse_schedule(data: dict[str, Any]) -> ScheduleResponse:
    """
    Parse raw registrar schedule data into structured format.
    
    Converts HTML-embedded schedule entries into clean course objects with
    normalized time blocks, course information, and color assignments.
    Handles malformed entries gracefully by skipping them.
    
    Args:
        data: Raw schedule data from registrar API (list or dict with 'data' key)
        
    Returns:
        ScheduleResponse with weekly schedule data and color preferences
        
    Note:
        - Week array uses 0-6 indices (Monday-Sunday)
        - Duplicate entries across time blocks are preserved (registrar behavior)
        - Colors are assigned cyclically to unique course IDs
    """
    week: list[list[dict[str, Any]]] = [[] for _ in range(7)]
    preferences = {"classes": [], "colors": {}}

    entries = data if isinstance(data, list) else data.get("data", [])
    br_pattern = re.compile(r"<\s*br\s*/?\s*>", re.IGNORECASE)
    tag_pattern = re.compile(r"<[^>]+>")
    whitespace_pattern = re.compile(r"\s+")
    course_code_pattern = re.compile(
        r"^(?P<codes>[A-Z]{2,}\s*\d{2,}[A-Z]?(?:\s*/\s*[A-Z]{2,}\s*\d{2,}[A-Z]?)*)(?:\s+|$)"
    )

    def parse_time_block(block: str) -> dict[str, Any]:
        match = re.search(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", block)
        if not match:
            raise ValueError(f"Unable to parse time block: {block!r}")
        start, end = match.groups()
        sh, sm = map(int, start.split(":"))
        eh, em = map(int, end.split(":"))
        return {"start": {"hh": sh, "mm": sm}, "end": {"hh": eh, "mm": em}}

    def normalize_html_block(value: str) -> list[str]:
        text = br_pattern.sub("\n", value)
        text = tag_pattern.sub("", text)
        text = unescape(text)
        lines = []
        for line in text.splitlines():
            normalized = whitespace_pattern.sub(" ", line).strip()
            if normalized:
                lines.append(normalized)
        return lines

    def add_class_preference(course_code: str) -> None:
        if course_code and course_code not in preferences["classes"]:
            preferences["classes"].append(course_code)

    def normalize_course_code(raw_code: str) -> str:
        normalized_code = re.sub(r"\s*/\s*", "/", raw_code)
        return whitespace_pattern.sub(" ", normalized_code).strip()

    def extract_course_codes(lines: list[str]) -> list[str]:
        course_codes: list[str] = []
        for line in lines:
            for match in COURSE_CODE_SEARCH_PATTERN.finditer(line):
                course_code = normalize_course_code(match.group("codes"))
                if course_code and course_code not in course_codes:
                    course_codes.append(course_code)
        return course_codes

    def parse_day(entry: str) -> dict[str, Any]:
        if not entry or not entry.strip():
            raise ValueError("Empty schedule entry")

        lines = normalize_html_block(entry)
        if not lines:
            raise ValueError("Unable to extract content from schedule entry")

        header = lines[0]
        header_stripped = header.strip()
        course_code = ""
        label = header

        code_match = course_code_pattern.match(header_stripped)
        course_match = None
        if code_match:
            raw_code = code_match.group("codes")
            course_code = normalize_course_code(raw_code)
            label = header_stripped[code_match.end():].strip()
        else:
            course_match = re.match(r"([A-Z]{2,}\s*\d{2,}[A-Z]?)\s*(.*)", header_stripped)
            if course_match:
                course_code = whitespace_pattern.sub(" ", course_match.group(1)).strip()
                label = course_match.group(2).strip()
            else:
                course_code = re.sub(r"\W+", "_", header_stripped).strip("_").upper()
                label = header_stripped

        time_line = next(
            (
                line
                for line in lines[1:]
                if re.search(r"\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}", line)
            ),
            "",
        )
        if not time_line:
            raise ValueError("Missing time information in schedule entry")

        time_info = parse_time_block(time_line)
        title = time_line.split(" /", 1)[0].strip()

        info = next((line for line in lines[1:] if line != time_line), "")
        remaining = [line for line in lines[1:] if line not in {time_line, info}]
        teacher = remaining[0] if remaining else ""
        cab = remaining[1] if len(remaining) > 1 else ""

        return {
            "label": label,
            "title": title,
            "info": info,
            "teacher": teacher,
            "cab": cab,
            "course_code": course_code,
            "time": time_info,
        }

    def parse_online_classes(value: Any) -> None:
        if isinstance(value, str):
            lines = normalize_html_block(value)
            for course_code in extract_course_codes(lines):
                add_class_preference(course_code)
            return
        if isinstance(value, list):
            for item in value:
                parse_online_classes(item)
            return
        if isinstance(value, dict):
            for item in value.values():
                parse_online_classes(item)

    def scan_online_sections(value: Any, *, in_online_section: bool = False) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                key_is_online = "ONLINE" in str(key).upper()
                scan_online_sections(
                    item,
                    in_online_section=in_online_section or key_is_online,
                )
            return
        if isinstance(value, list):
            for item in value:
                scan_online_sections(item, in_online_section=in_online_section)
            return
        if isinstance(value, str) and (
            in_online_section or "ONLINE CLASSES" in value.upper()
        ):
            parse_online_classes(value)

    for entry in entries:
        for index, day in enumerate(WEEKDAYS):
            day_value = entry.get(day)
            if not day_value:
                continue
            try:
                item = parse_day(day_value)
            except ValueError:
                continue
            week[index].append(item)
            add_class_preference(item["course_code"])

        for key, value in entry.items():
            if "ONLINE" in str(key).upper() and value:
                parse_online_classes(value)

    scan_online_sections(data)

    color_cycle = (color for color in COLORS)
    for course_code in preferences["classes"]:
        try:
            color = next(color_cycle)
        except StopIteration:
            color_cycle = (color for color in COLORS)
            color = next(color_cycle)
        preferences["colors"][course_code] = color

    return ScheduleResponse(data=week, preferences=preferences)


def parse_personal_schedule_pdf(pdf_file: bytes) -> ScheduleResponse:
    """Parse a registrar personal schedule PDF into the same shape as getTimetable."""
    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_file)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    text = "\n".join(text_parts)
    normalized_text = re.sub(r"\s+", " ", text).upper()
    if "PERSONAL TIMETABLE" in normalized_text:
        raise ValueError("invalid_schedule_pdf_personal_timetable")
    if "PERSONAL SCHEDULE" not in normalized_text:
        raise ValueError("invalid_schedule_pdf")
    return _parse_personal_schedule_text(text)


def _parse_personal_schedule_text(text: str) -> ScheduleResponse:
    if "PERSONAL TIMETABLE" in re.sub(r"\s+", " ", text).upper():
        raise ValueError("invalid_schedule_pdf_personal_timetable")

    week: list[list[dict[str, Any]]] = [[] for _ in range(7)]
    preferences = {"classes": [], "colors": {}}
    current_day: int | None = None
    whitespace_pattern = re.compile(r"\s+")
    time_row_pattern = re.compile(
        r"^(?P<start>\d{1,2}:\d{2})\s*(?P<start_ampm>AM|PM)\s+"
        r"(?P<end>\d{1,2}:\d{2})\s*(?P<end_ampm>AM|PM)\s+(?P<body>.+)$",
        re.IGNORECASE,
    )

    def add_class_preference(course_code: str) -> None:
        if course_code and course_code not in preferences["classes"]:
            preferences["classes"].append(course_code)

    def normalize_line(line: str) -> str:
        return whitespace_pattern.sub(" ", line).strip()

    def normalize_course_code(raw_code: str) -> str:
        normalized_code = re.sub(r"\s*/\s*", "/", raw_code)
        return whitespace_pattern.sub(" ", normalized_code).strip()

    def parse_12h(value: str, ampm: str) -> dict[str, int]:
        hours, minutes = map(int, value.split(":"))
        marker = ampm.upper()
        if marker == "PM" and hours != 12:
            hours += 12
        elif marker == "AM" and hours == 12:
            hours = 0
        return {"hh": hours, "mm": minutes}

    def add_codes_from_line(line: str) -> None:
        for match in COURSE_CODE_SEARCH_PATTERN.finditer(line):
            add_class_preference(normalize_course_code(match.group("codes")))

    for raw_line in text.splitlines():
        line = normalize_line(raw_line)
        if not line:
            continue
        upper_line = line.upper()
        if upper_line == "ONLINE CLASSES":
            current_day = None
            continue
        if upper_line in WEEKDAYS:
            current_day = WEEKDAYS.index(upper_line)
            continue

        add_codes_from_line(line)
        time_match = time_row_pattern.match(line)
        if current_day is None or not time_match:
            continue

        body = time_match.group("body")
        code_match = COURSE_CODE_SEARCH_PATTERN.search(body)
        if not code_match:
            continue

        course_code = normalize_course_code(code_match.group("codes"))
        room = body[: code_match.start()].strip()
        label = body[code_match.end() :].strip()
        week[current_day].append(
            {
                "label": label,
                "title": label,
                "info": "",
                "teacher": "",
                "cab": room,
                "course_code": course_code,
                "time": {
                    "start": parse_12h(
                        time_match.group("start"),
                        time_match.group("start_ampm"),
                    ),
                    "end": parse_12h(
                        time_match.group("end"),
                        time_match.group("end_ampm"),
                    ),
                },
            }
        )

    color_cycle = (color for color in COLORS)
    for course_code in preferences["classes"]:
        try:
            color = next(color_cycle)
        except StopIteration:
            color_cycle = (color for color in COLORS)
            color = next(color_cycle)
        preferences["colors"][course_code] = color

    return ScheduleResponse(data=week, preferences=preferences)