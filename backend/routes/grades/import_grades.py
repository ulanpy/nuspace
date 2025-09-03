"""Simple import script to load normalized CSV into grade_reports table.

Usage:
  python import_grades.py /path/to/grades_faculty_normalized.csv

This script uses sync SQLAlchemy engine and the DATABASE_URL from backend.core.configs.config
"""

import json
import sys
from pathlib import Path

from .utils import import_from_csv

BATCH = 50


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
        # store raw CSV row as valid JSON (double-quoted) to match Postgres json column
        "raw_row": json.dumps(row, ensure_ascii=False),
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python import_grades.py /path/to/normalized.csv")
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.exists():
        print("File not found:", path)
        sys.exit(1)

    inserted = import_from_csv(path, batch_size=BATCH)
    print("Done. Total inserted:", inserted)


if __name__ == "__main__":
    main()
