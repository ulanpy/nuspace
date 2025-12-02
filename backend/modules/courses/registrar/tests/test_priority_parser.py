from backend.modules.courses.registrar.parsers import priority_parser


def _fake_table_row(
    index: str,
    abbr: str,
    title: str = "Course Title",
    prereq: str = "Prereq",
) -> list[str]:
    return [
        index,
        abbr,
        title,
        "",  # credits col placeholder
        "",  # ects
        prereq,
        "",  # coreq
        "",  # antireq
        "",  # priority 1
        "",  # priority 2
        "",  # priority 3
        "",  # priority 4
    ]


def test_parse_pdf_skips_explicit_header(monkeypatch):
    table = [
        ["#", "Abbr", "Title", "Cr", "ECTS", "Pre", "Co", "Anti", "P1", "P2", "P3", "P4"],
        _fake_table_row("1", "MATH 162"),
    ]

    monkeypatch.setattr(priority_parser, "iter_tables", lambda _: [table])

    rows = priority_parser.parse_pdf(b"fake")
    assert len(rows) == 1
    assert rows[0]["abbr"] == "MATH 162"


def test_parse_pdf_keeps_first_row_when_no_header(monkeypatch):
    table = [
        _fake_table_row("1", "MATH 162"),
        _fake_table_row("2", "MATH 263"),
    ]

    monkeypatch.setattr(priority_parser, "iter_tables", lambda _: [table])

    rows = priority_parser.parse_pdf(b"fake")
    assert rows[0]["abbr"] == "MATH 162"
    assert rows[1]["abbr"] == "MATH 263"


