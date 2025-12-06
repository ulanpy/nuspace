# Grade Extraction Pipeline

This bundle provides a single, shareable pipeline to:
- Convert grade report PDFs to text (`pdftotext -layout`).
- Parse grade distributions from Part E tables.
- Join with the school schedule to assign instructors and correct section letters.
- Fix remaining mismatches and normalize cross-listed course codes and full course titles.
- Split multi-instructor courses into one row per instructor.

## Requirements
- Linux/macOS with `pdftotext` installed (from `poppler`).
- Python 3.9+.

## Quick Start
1. Place all grade report PDFs into a directory, e.g. `reports/`.
2. Ensure your schedule CSV is available (e.g. `school_schedule_by_term.csv`).
3. Run the pipeline:

```bash
python3 run_pipeline.py --pdf-dir ../reports --schedule ../school_schedule_by_term.csv --term SP2025
```

Notes:
- The script creates an intermediate text folder `.work_txt` in the bundle directory.
- Outputs are written two levels up by default (next to your CSVs), specifically:
  - `../grades_with_professors.csv`
  - `../grades_with_professors_mismatches.csv`

You can change paths via flags.

## CLI Options
- `--pdf-dir`: Directory containing grade report PDFs.
- `--schedule`: Path to `school_schedule_by_term.csv`.
- `--term`: Term code (e.g., `SP2025`).
- `--work`: Directory for intermediate text files (default: `.work_txt`).
- `--out`: Output CSV path (default: `../grades_with_professors.csv`).
- `--mismatches`: Mismatches CSV path (default: `../grades_with_professors_mismatches.csv`).

## Output Schema
`grades_with_professors.csv` columns:
- `course_code`, `course_title`, `section`, `grades_count`, `avg_gpa`, `std_dev`, `median_gpa`,
- `pct_A`, `pct_B`, `pct_C`, `pct_D`, `pct_F`, `pct_P`, `pct_I`, `pct_AU`, `pct_W_AW`,
- `letters_count`, `term`, `faculty`

## How It Handles Edge Cases
- Cross-listed courses: Expands to the full code from the schedule (e.g., `HST 110/REL 110`).
- Section letters: Resolves `L`, `S`, `Lb` using schedule `S/T` and title hints.
- Truncated titles: Replaces with full titles from the schedule when available.
- Multiple instructors: Duplicates rows so each instructor has a separate entry.

## Troubleshooting
- If `pdftotext` is missing, install `poppler` (e.g., `sudo apt install poppler-utils`).
- Ensure the schedule CSV header starts at the third line (as exported) or adjust the loader.
- If mismatches persist, check special formatting in PDFs; you can refine regex or title heuristics in `run_pipeline.py`.