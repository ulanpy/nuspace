from backend.modules.courses.registrar.parsers.registrar_parser import (
    _parse_personal_schedule_text,
    parse_schedule,
)
import pytest


def build_entry(header: str) -> list[dict[str, str]]:
    return [
        {
            "MONDAY": "<br>".join(
                [
                    header,
                    "Lecture / 10:30 - 11:45",
                    "6 ECTS credits",
                    "Jonathan Dupuy",
                    "6.410",
                ]
            )
        }
    ]


def test_multi_code_header_preserved() -> None:
    data = build_entry("WLL 235/WCS 260 Creative Writing I")

    schedule = parse_schedule(data)

    entry = schedule.data[0][0]
    assert entry.course_code == "WLL 235/WCS 260"
    assert entry.label == "Creative Writing I"


def test_fallback_header_without_code() -> None:
    data = build_entry("Creative Writing I")

    schedule = parse_schedule(data)

    entry = schedule.data[0][0]
    assert entry.course_code == "CREATIVE_WRITING_I"
    assert entry.label == "Creative Writing I"


def test_online_classes_added_to_preferences() -> None:
    data = {
        "data": [
            {
                "MONDAY": "<br>".join(
                    [
                        "PHYS 162 Physics II for Scientists and Engineers with Laboratory",
                        "Lecture / 12:00 - 13:15",
                        "8 ECTS credits",
                        "Alexander Tikhonov",
                        "Blue Hall",
                    ]
                ),
            }
        ],
        "ONLINE_CLASSES": [
            "<br>".join(
                [
                    "11:00 PM 11:59 PM TBA CSCI 299 Internship I",
                    "10:00 PM 10:59 PM TBA MATH 299 Research Seminar",
                    "6 ECTS credits",
                    "Askar Boranbayev",
                    "01/06/2026 22/07/2026",
                ]
            )
        ],
    }

    schedule = parse_schedule(data)

    assert "PHYS 162" in schedule.preferences.classes
    assert "CSCI 299" in schedule.preferences.classes
    assert "MATH 299" in schedule.preferences.classes
    assert all(item.course_code != "CSCI 299" for day in schedule.data for item in day)


def test_personal_schedule_pdf_text_keeps_online_classes_as_courses() -> None:
    text = """
Schedule by days
Monday
12:00 PM 01:15 PM Blue Hall PHYS 162 Physics II for Scientists and Engineers
Online classes
11:00 PM 11:59 PM TBA CSCI 299 Internship I 6 1Int Askar Boranbayev 01/06/2026 22/07/2026
"""

    schedule = _parse_personal_schedule_text(text)

    assert schedule.data[0][0].course_code == "PHYS 162"
    assert schedule.data[0][0].cab == "Blue Hall"
    assert "PHYS 162" in schedule.preferences.classes
    assert "CSCI 299" in schedule.preferences.classes
    assert all(item.course_code != "CSCI 299" for day in schedule.data for item in day)


def test_personal_timetable_text_is_not_accepted_as_schedule() -> None:
    with pytest.raises(ValueError):
        _parse_personal_schedule_text("Personal Timetable\nCSCI 299 Internship I")
