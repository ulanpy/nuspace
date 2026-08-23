import pytest
from backend.modules.courses.registrar.parsers.registrar_parser import (
    _parse_personal_schedule_text,
    parse_schedule,
)


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


def test_online_table_row_with_blank_weekdays_is_added_to_preferences() -> None:
    data = [
        {
            "TIME": "11:00 PM 11:59 PM TBA BIOL 490 Honors Thesis Research",
            "MONDAY": "",
            "TUESDAY": "",
            "WEDNESDAY": "",
            "THURSDAY": "",
            "FRIDAY": "",
            "SATURDAY": "",
            "SUNDAY": "",
        }
    ]

    schedule = parse_schedule(data)

    assert schedule.preferences.classes == ["BIOL 490"]
    assert all(not day for day in schedule.data)


def test_rendered_student_schedule_adds_online_course_to_preferences() -> None:
    data = {
        "data": [],
        "student_schedule_table": "Online classes<br>BIOL 490 Honors Thesis Research",
    }

    schedule = parse_schedule(data)

    assert schedule.preferences.classes == ["BIOL 490"]


def test_rendered_student_schedule_adds_timed_course_to_week() -> None:
    data = {
        "data": [],
        "student_schedule_table": (
            "Monday<br>03:00 PM 05:50 PM 7.105 CHEM 432 " "Introduction to Cheminformatics"
        ),
    }

    schedule = parse_schedule(data)

    assert len(schedule.data[0]) == 1
    assert schedule.data[0][0].course_code == "CHEM 432"
    assert schedule.data[0][0].time.start.hh == 15
    assert schedule.data[0][0].time.end.hh == 17


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


def test_personal_schedule_pdf_text_joins_wrapped_course_code() -> None:
    text = """
Personal Schedule
Monday
03:00 PM 05:50 PM 7.105 CHEM
432 Introduction to Cheminformatics
"""

    schedule = _parse_personal_schedule_text(text)

    assert schedule.data[0][0].course_code == "CHEM 432"
    assert "CHEM 432" in schedule.preferences.classes


def test_personal_timetable_text_is_not_accepted_as_schedule() -> None:
    with pytest.raises(ValueError):
        _parse_personal_schedule_text("Personal Timetable\nCSCI 299 Internship I")
