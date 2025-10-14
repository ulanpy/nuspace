from typing import Any
from backend.modules.courses.crashed.schemas import ScheduleResponse
import re
from html import unescape


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
    colors = [
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

    weekdays = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
    ]

    br_pattern = re.compile(r"<\s*br\s*/?\s*>", re.IGNORECASE)
    tag_pattern = re.compile(r"<[^>]+>")
    whitespace_pattern = re.compile(r"\s+")

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

    def parse_day(entry: str) -> dict[str, Any]:
        if not entry or not entry.strip():
            raise ValueError("Empty schedule entry")

        lines = normalize_html_block(entry)
        if not lines:
            raise ValueError("Unable to extract content from schedule entry")

        header = lines[0]
        course_match = re.match(r"([A-Z]{2,}\s*\d{2,}[A-Z]?)\s*(.*)", header)
        if course_match:
            course_code = course_match.group(1)
            label = course_match.group(2).strip()
        else:
            course_code = re.sub(r"\W+", "_", header).strip("_")
            label = header

        time_line = next((line for line in lines[1:] if re.search(r"\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}", line)), "")
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

    for entry in entries:
        for index, day in enumerate(weekdays):
            day_value = entry.get(day)
            if not day_value:
                continue
            try:
                item = parse_day(day_value)
            except ValueError:
                continue
            week[index].append(item)
            if item["course_code"] not in preferences["classes"]:
                preferences["classes"].append(item["course_code"])

    color_cycle = (color for color in colors)
    for course_code in preferences["classes"]:
        try:
            color = next(color_cycle)
        except StopIteration:
            color_cycle = (color for color in colors)
            color = next(color_cycle)
        preferences["colors"][course_code] = color

    return ScheduleResponse(data=week, preferences=preferences)

