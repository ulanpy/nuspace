import csv
import json
from pathlib import Path
from typing import IO, Optional

from sqlalchemy import create_engine, text

from backend.core.configs.config import config


def parse_row(row: dict) -> dict:
    """Map CSV row to DB columns and coerce types."""

    def to_float(v):
        try:
            return float(v)
        except Exception:
            return None

    def to_int(v):
        try:
            return int(float(v))
        except Exception:
            return None

    return {
        "course_code": row.get("course_code"),
        "course_title": row.get("course_title"),
        "section": row.get("section"),
        "term": row.get("term"),
        "grades_count": to_int(row.get("grades_count")),
        "avg_gpa": to_float(row.get("avg_gpa")),
        "std_dev": to_float(row.get("std_dev")),
        "median_gpa": to_float(row.get("median_gpa")),
        "pct_A": to_float(row.get("pct_A")),
        "pct_B": to_float(row.get("pct_B")),
        "pct_C": to_float(row.get("pct_C")),
        "pct_D": to_float(row.get("pct_D")),
        "pct_F": to_float(row.get("pct_F")),
        "pct_P": to_float(row.get("pct_P")),
        "pct_I": to_float(row.get("pct_I")),
        "pct_AU": to_float(row.get("pct_AU")),
        "pct_W_AW": to_float(row.get("pct_W_AW")),
        "letters_count": to_int(row.get("letters_count")),
        "faculty": row.get("faculty"),
        "raw_row": json.dumps(row, ensure_ascii=False),
    }


def import_from_csv(
    source: Path | str | IO,
    batch_size: int = 50,
    replace: bool = False,
    course_code: Optional[str] = None,
    term: Optional[str] = None,
):
    """Import normalized CSV into grade_reports table.

    `source` may be a path or a file-like object.
    If `replace` is True and both course_code and term are provided, existing rows for that
    course+term will be deleted before insert.
    Returns total inserted count.
    """
    engine = create_engine(config.DATABASE_URL.replace("+asyncpg", ""), future=True)

    def _build_insert_sql(batch):
        plain_cols = [
            "course_code",
            "course_title",
            "section",
            "term",
            "grades_count",
            "avg_gpa",
            "std_dev",
            "median_gpa",
            "pct_A",
            "pct_B",
            "pct_C",
            "pct_D",
            "pct_F",
            "pct_P",
            "pct_I",
            "pct_AU",
            "pct_W_AW",
            "letters_count",
            "faculty",
            "raw_row",
        ]
        quoted_cols = [f'"{c}"' for c in plain_cols] + ['"created_at"', '"updated_at"']

        vals = []
        for i in range(len(batch)):
            placeholders = ",".join([f":{col}_{i}" for col in plain_cols] + ["now()", "now()"])
            vals.append(f"({placeholders})")

        sql = f"INSERT INTO grade_reports ({', '.join(quoted_cols)}) VALUES {', '.join(vals)}"
        return sql

    def _flatten_params(batch):
        params = {}
        for i, row in enumerate(batch):
            for k, v in row.items():
                params[f"{k}_{i}"] = v
        return params

    # open the source
    opened = None
    if isinstance(source, (str, Path)):
        opened = open(source, encoding="utf-8")
        reader = csv.DictReader(opened)
    else:
        reader = csv.DictReader(source)

    with engine.begin() as conn:
        # optional replace
        if replace and course_code and term:
            conn.execute(
                text("DELETE FROM grade_reports WHERE course_code = :course_code AND term = :term"),
                {"course_code": course_code, "term": term},
            )

        batch = []
        inserted = 0
        for row in reader:
            parsed = parse_row(row)
            batch.append(parsed)
            if len(batch) >= batch_size:
                conn.execute(text(_build_insert_sql(batch)), _flatten_params(batch))
                inserted += len(batch)
                print("Inserted", inserted, "rows (batch size:", len(batch), ")")
                batch = []
        if batch:
            conn.execute(text(_build_insert_sql(batch)), _flatten_params(batch))
            inserted += len(batch)
            print("Inserted", inserted, "rows (final batch size:", len(batch), ")")

    if opened:
        opened.close()

    return inserted
