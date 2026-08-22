from backend.modules.courses.registrar.parsers.schedule_pdf_parser import _parse_rows


def test_parse_rows_handles_line_wrapped_ects_header() -> None:
    rows = [
        [
            "School",
            "Level",
            "Course Abbr",
            "S/T",
            "Course Title",
            "Cr(US)",
            "Cr(EC\nTS)",
            "Start date",
            "End date",
            "Days",
            "Time",
            "Enr",
            "Cap",
            "Faculty",
            "Room",
        ],
        [
            "SSH",
            "UG",
            "ANT 101",
            "1L",
            "Being Human",
            "3.0",
            "5.0",
            "17-AUG-26",
            "27-NOV-26",
            "M W",
            "10:00 AM-10:50 AM",
            "12",
            "30",
            "Faculty Name",
            "8.101",
        ],
    ]

    documents = _parse_rows(rows, term_label="Fall 2026", term_id="825")

    assert documents[0]["credits_us"] == "3.0"
    assert documents[0]["credits_ects"] == "5.0"
