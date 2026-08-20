from backend.modules.courses.csv_parsers.run_pipeline import parse_grade_text


def test_parser_preserves_missing_withdrawal_column_as_none() -> None:
    rows = parse_grade_text(
        "CSCI 111 Web Programming and Problem Solving 1 32 2.79 0.72 3.0 "
        "12.5 56.2 25.0 6.2 0.0 0.0 0.0 0.0 32"
    )

    assert len(rows) == 1
    assert rows[0]["letters_count"] == "32"
    assert rows[0]["pct_W_AW"] is None


def test_parser_preserves_reported_zero_withdrawal_rate() -> None:
    rows = parse_grade_text(
        "CSCI 111 Web Programming and Problem Solving 1 32 2.79 0.72 3.0 "
        "12.5 56.2 25.0 6.2 0.0 0.0 0.0 0.0 0.0 32"
    )

    assert len(rows) == 1
    assert rows[0]["pct_W_AW"] == "0.0"
