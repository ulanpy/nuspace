"""Simple import script to load normalized CSV into grade_reports table.

Usage:
  python import_grades.py /path/to/grades_faculty_normalized.csv

This script uses sync SQLAlchemy engine and the DATABASE_URL from backend.core.configs.config
"""

import csv
import sys
from pathlib import Path

from backend.core.configs.config import config
from sqlalchemy import create_engine, text

BATCH = 500


def parse_row(row):
    # map csv fields to DB columns
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
        "raw_row": str(row),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_grades.py /path/to/normalized.csv")
        sys.exit(1)

    path = Path(sys.argv[1])
    if not path.exists():
        print("File not found:", path)
        sys.exit(1)

    engine = create_engine(config.DATABASE_URL.replace("+asyncpg", ""), future=True)

    with engine.begin() as conn:
        with path.open(encoding="utf-8") as f:
            reader = csv.DictReader(f)
            batch = []
            inserted = 0
            for row in reader:
                parsed = parse_row(row)
                batch.append(parsed)
                if len(batch) >= BATCH:
                    conn.execute(text(_build_insert_sql(batch)), _flatten_params(batch))
                    inserted += len(batch)
                    print("Inserted", inserted)
                    batch = []
            if batch:
                conn.execute(text(_build_insert_sql(batch)), _flatten_params(batch))
                inserted += len(batch)
                print("Inserted", inserted)

    print("Done. Total inserted:", inserted)


def _build_insert_sql(batch):
    # builds a parametric insert for multiple rows
    cols = [
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
    vals = []
    for i in range(len(batch)):
        placeholders = ",".join([f":{col}_{i}" for col in cols])
        vals.append(f"({placeholders})")
    sql = f"INSERT INTO grade_reports ({', '.join(cols)}) VALUES {', '.join(vals)}"
    return sql


def _flatten_params(batch):
    params = {}
    for i, row in enumerate(batch):
        for k, v in row.items():
            params[f"{k}_{i}"] = v
    return params


if __name__ == "__main__":
    main()
