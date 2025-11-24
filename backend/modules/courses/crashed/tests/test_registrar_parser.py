from backend.modules.courses.crashed.registrar.registrar_parser import parse_schedule


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

