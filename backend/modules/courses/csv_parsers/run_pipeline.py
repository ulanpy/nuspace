import argparse
import csv
import re
import subprocess
from pathlib import Path


def run_pdftotext(pdf: Path, out_txt: Path):
    subprocess.run(["pdftotext", "-layout", str(pdf), str(out_txt)], check=True)


def convert_pdfs(pdf_dir: Path, txt_dir: Path):
    txt_dir.mkdir(parents=True, exist_ok=True)
    for pdf in sorted(pdf_dir.glob("*.pdf")):
        out_txt = txt_dir / (pdf.stem + ".txt")
        run_pdftotext(pdf, out_txt)


ROW_LINE = re.compile(
    r"^(?P<code>[A-Z&/ ]+\d+[A-Z]?)[ ,]*(?P<title>.+?)\s+(?P<section>\d+)\s+"
    r"(?P<grades>\d+)\s+(?P<avg>[0-9.]+)\s+(?P<std>[0-9.]+)\s+(?P<median>[0-9.]+)\s+"
    r"(?P<pA>[0-9.]+)\s+(?P<pB>[0-9.]+)\s+(?P<pC>[0-9.]+)\s+(?P<pD>[0-9.]+)\s+(?P<pF>[0-9.]+)\s+"
    r"(?P<pP>[0-9.]+)\s+(?P<pI>[0-9.]+)\s+(?P<pAU>[0-9.]+)\s+(?P<pW>[0-9.]+)\s+(?P<letters>\d+)"
)


def parse_grade_text(text: str):
    rows = []
    buf = ""

    def flush(line):
        m = ROW_LINE.match(line)
        if not m:
            return False
        title = m.group("title").strip()
        # skip summaries
        if any(k in title.lower() for k in ["overall", "internship", "thesis"]):
            return True
        code = m.group("code").strip()
        rows.append(
            {
                "course_code": code,
                "course_title": title,
                "section": m.group("section"),
                "grades_count": m.group("grades"),
                "avg_gpa": m.group("avg"),
                "std_dev": m.group("std"),
                "median_gpa": m.group("median"),
                "pct_A": m.group("pA"),
                "pct_B": m.group("pB"),
                "pct_C": m.group("pC"),
                "pct_D": m.group("pD"),
                "pct_F": m.group("pF"),
                "pct_P": m.group("pP"),
                "pct_I": m.group("pI"),
                "pct_AU": m.group("pAU"),
                "pct_W_AW": m.group("pW"),
                "letters_count": m.group("letters"),
            }
        )
        return True

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line:
            continue
        if flush(line):
            buf = ""
        else:
            # stitch wrapped titles
            if buf:
                combined = (buf + " " + line).strip()
                if flush(combined):
                    buf = ""
                else:
                    buf = combined
            else:
                buf = line
    return rows


def load_schedule(schedule_csv: Path):
    with schedule_csv.open(encoding="utf-8") as f:
        lines = f.read().splitlines()
        data = lines[2:] if len(lines) > 2 else lines
        reader = csv.DictReader(data)
        sched = []
        for r in reader:
            if not r.get("Course Abbr"):
                continue
            sched.append(
                {
                    "Course Abbr": r.get("Course Abbr", "").strip(),
                    "S/T": r.get("S/T", "").strip(),
                    "Course Title": r.get("Course Title", "").strip(),
                    "Faculty": r.get("Faculty", "").strip(),
                }
            )
    return sched


def pick_section_letter(sched_rows, section_num, title):
    cand = [s for s in sched_rows if s["S/T"].startswith(section_num)]
    if len(cand) == 1:
        return cand[0]["S/T"], cand[0]["Faculty"], cand[0]["Course Title"]
    title_l = (title or "").lower()
    prefer = "L"
    if any(k in title_l for k in ["lab", "laboratory", "clinic", "clinical"]):
        prefer = "Lb"
    elif "seminar" in title_l:
        prefer = "S"
    for s in cand:
        if s["S/T"].endswith(prefer):
            return s["S/T"], s["Faculty"], s["Course Title"]
    if cand:
        s = cand[0]
        return s["S/T"], s["Faculty"], s["Course Title"]
    return None, None, None


def join_with_schedule(grade_rows, schedule_rows, term):
    out = []
    for r in grade_rows:
        code = r["course_code"].lstrip("/").strip()
        section_num = r["section"].strip()
        title = r["course_title"].lstrip("/").strip()
        # Try cross-listed: find schedule entries containing code
        sched_for_code = [
            s
            for s in schedule_rows
            if s["Course Abbr"].startswith(code) or code in s["Course Abbr"]
        ]
        st, fac, s_title = pick_section_letter(sched_for_code, section_num, title)
        if not st:
            # fallback by title fragment
            frag = title.split(",")[0][:30].lower()
            sched_for_title = [
                s for s in schedule_rows if frag and frag in s["Course Title"].lower()
            ]
            st, fac, s_title = pick_section_letter(sched_for_title, section_num, title)
        row = dict(r)
        row["section"] = st or section_num
        row["term"] = term
        row["faculty"] = fac or ""
        if s_title:
            row["course_title"] = s_title
        # preserve full cross-listed code if found
        if st and sched_for_code:
            try:
                full_code = next(s["Course Abbr"] for s in sched_for_code if s["S/T"] == st)
            except StopIteration:
                full_code = sched_for_code[0]["Course Abbr"]
            row["course_code"] = full_code
        out.append(row)
    return out


def write_csv(path: Path, rows):
    fields = [
        "course_code",
        "course_title",
        "section",
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
        "term",
        "faculty",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def split_instructors(csv_path: Path):
    with csv_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    def split_faculty(fac: str):
        parts = [p.strip() for p in (fac or "").split(",")]
        return [p for p in parts if p]

    out = []
    for r in rows:
        facs = split_faculty(r.get("faculty", ""))
        if len(facs) <= 1:
            out.append(r)
        else:
            for fac in facs:
                dup = dict(r)
                dup["faculty"] = fac
                out.append(dup)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in out:
            w.writerow(r)


def normalize_courses(csv_path: Path, schedule_rows):
    with csv_path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        code = (r.get("course_code") or "").strip()
        section = (r.get("section") or "").strip()
        candidates = [
            s
            for s in schedule_rows
            if s["S/T"] == section
            and (code and (s["Course Abbr"].startswith(code) or code in s["Course Abbr"]))
        ]
        if candidates:
            s = candidates[0]
            r["course_code"] = s["Course Abbr"]
            if s["Course Title"]:
                r["course_title"] = s["Course Title"]
            if not (r.get("faculty") or "").strip() and s["Faculty"]:
                r["faculty"] = s["Faculty"]
        out.append(r)
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        for r in out:
            w.writerow(r)


def main():
    ap = argparse.ArgumentParser(description="Shareable grade extraction pipeline")
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--schedule", required=True)
    ap.add_argument("--term", required=True)
    ap.add_argument("--work", default=".work_txt")
    ap.add_argument("--out", default="../grades_with_professors.csv")
    ap.add_argument("--mismatches", default="../grades_with_professors_mismatches.csv")
    args = ap.parse_args()

    pdf_dir = Path(args.pdf_dir)
    txt_dir = Path(args.work)
    schedule_csv = Path(args.schedule)
    out_csv = Path(args.out)
    mismatches_csv = Path(args.mismatches)

    convert_pdfs(pdf_dir, txt_dir)
    grade_rows = []
    for txt in sorted(txt_dir.glob("*.txt")):
        with txt.open(encoding="utf-8") as f:
            grade_rows.extend(parse_grade_text(f.read()))

    schedule_rows = load_schedule(schedule_csv)
    joined = join_with_schedule(grade_rows, schedule_rows, args.term)
    write_csv(out_csv, joined)

    # mismatches: empty faculty
    mismatches = [r for r in joined if not (r.get("faculty") or "").strip()]
    write_csv(mismatches_csv, mismatches)

    # Normalize course codes/titles and split instructors
    normalize_courses(out_csv, schedule_rows)
    split_instructors(out_csv)
    print(f"Pipeline complete. See {out_csv} and {mismatches_csv}.")


if __name__ == "__main__":
    main()
