from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from backend.modules.courses.degree_audit.transcript_parser import Course, Transcript

BASE_DIR = Path(__file__).resolve().parent
REQUIREMENTS_BASE = BASE_DIR / "requirements"

GRADE_ORDER = [
    "F",
    "D",
    "D+",
    "C-",
    "C",
    "C+",
    "B-",
    "B",
    "B+",
    "A-",
    "A",
]
GRADE_RANK = {g: i for i, g in enumerate(GRADE_ORDER)}
NON_APPLICABLE_GRADES = {"AU", "AW", "I", "IP", "W"}


@dataclass
class Requirement:
    course_id: str
    course_code: str
    course_name: str
    credits_need: float
    min_grade: str
    comments: str
    options: List[str]
    must_haves: List[str]
    excepts: List[str]


@dataclass
class RequirementResult:
    requirement: Requirement
    status: str  # "Satisfied" or "Pending"
    used_courses: List[str]  # strings with course code and credits consumed
    credits_applied: float
    credits_remaining: float
    note: str


def _normalize_major_name(stem: str) -> str:
    prefix = "Degree audit requirments for all majors - "
    if stem.startswith(prefix):
        stem = stem[len(prefix) :]
    stem = stem.split("__", 1)[0]
    return stem.replace("_", " ").strip()


def _extract_year_from_stem(stem: str) -> Optional[str]:
    m = re.search(r"__(\d{4})$", stem)
    return m.group(1) if m else None


def discover_requirements_by_year(base: Path = REQUIREMENTS_BASE) -> Dict[str, Dict[str, Path]]:
    """Return mapping of admission year -> {major name -> CSV path}."""
    majors_by_year: Dict[str, Dict[str, Path]] = {}

    def _add(path: Path, year: str) -> None:
        major = _normalize_major_name(path.stem)
        if not major:
            return
        majors_by_year.setdefault(year, {})
        majors_by_year[year][major] = path

    if not base.exists():
        return majors_by_year

    for entry in base.iterdir():
        if entry.is_dir() and re.fullmatch(r"\d{4}", entry.name):
            for csv_path in entry.glob("*.csv"):
                _add(csv_path, entry.name)

    # Legacy fallback: top-level CSVs named with __YEAR suffix.
    for csv_path in base.glob("*.csv"):
        year = _extract_year_from_stem(csv_path.stem)
        if not year:
            continue
        _add(csv_path, year)

    return {
        year: dict(sorted(majors.items(), key=lambda item: item[0].lower()))
        for year, majors in sorted(majors_by_year.items(), key=lambda item: item[0])
    }


def requirement_for_major_year(
    major: str, year: str, catalog: Dict[str, Dict[str, Path]] | None = None
) -> Path | None:
    data = catalog or discover_requirements_by_year()
    return data.get(year, {}).get(major)


def normalize_grade(grade: str) -> str:
    cleaned = grade.strip().upper()
    cleaned = cleaned.replace("*", "")
    if cleaned in NON_APPLICABLE_GRADES:
        return cleaned
    if cleaned in {"PASS", "FAIL", "P", "F"}:
        return "PASS" if cleaned in {"PASS", "P"} else "FAIL"
    cleaned = re.sub(r"[^A-Z+-]", "", cleaned)
    return cleaned or grade.upper()


def is_non_applicable_grade(grade: str) -> bool:
    return normalize_grade(grade) in NON_APPLICABLE_GRADES


def format_credit(value) -> str:
    """Render credits without trailing .0 for whole numbers."""
    if value is None:
        return ""
    try:
        v = float(value)
    except Exception:
        return str(value)
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    return f"{v:.2f}".rstrip("0").rstrip(".")


def compute_credit_summary(
    transcript: Transcript, requirements: List[Requirement], results: Iterable[RequirementResult]
) -> Dict[str, str]:
    total_required = sum(req.credits_need for req in requirements)
    total_applied = sum(res.credits_applied for res in results)
    total_remaining = max(total_required - total_applied, 0.0)
    if transcript.overall_credits_earned is not None:
        total_taken = transcript.overall_credits_earned
    else:
        total_taken = sum(
            course.credits
            for sem in transcript.semesters
            for course in sem.courses
            if not is_non_applicable_grade(course.grade)
        )
    return {
        "total_required": format_credit(total_required),
        "total_applied": format_credit(total_applied),
        "total_remaining": format_credit(total_remaining),
        "total_taken": format_credit(total_taken),
    }


def grade_meets(grade: str, min_grade: str) -> bool:
    g = normalize_grade(grade)
    req = normalize_grade(min_grade or "D")

    if g in NON_APPLICABLE_GRADES:
        return False

    # Handle PASS/FAIL semantics.
    if g == "PASS":
        # Passing counts for any min grade threshold.
        return True
    if g == "FAIL":
        return False
    if req == "PASS":
        # Only explicit pass or letter at/above D counts.
        if g in {"PASS", "FAIL"}:
            return g == "PASS"
        req = "D"
    if g not in GRADE_RANK or req not in GRADE_RANK:
        # Fall back to direct equality if we cannot rank
        return g == req
    return GRADE_RANK[g] >= GRADE_RANK[req]


def _column_sort_key(col: str) -> int:
    digits = "".join(filter(str.isdigit, col))
    return int(digits) if digits else 0


def load_special_requirements(
    folder: Path | Sequence[Path] | None = None, *, year: str | None = None
) -> Dict[str, List[str]]:
    """Load special requirement tables (e.g., Soc/Hum electives) into a name->values mapping."""
    mapping: Dict[str, List[str]] = {}
    base_paths: List[Path] = []
    if folder is None:
        base_paths = [
            REQUIREMENTS_BASE / "additional_tables",
            REQUIREMENTS_BASE / "special_reqs",
        ]
    elif isinstance(folder, Path):
        base_paths = [folder]
    elif isinstance(folder, (str, bytes)):
        base_paths = [Path(folder)]
    else:
        base_paths = [Path(p) for p in folder]

    search_paths: List[Path] = []
    for base in base_paths:
        if year:
            search_paths.append(base / str(year))
        search_paths.append(base)

    seen_dirs = set()
    for directory in search_paths:
        if not directory.exists() or directory in seen_dirs:
            continue
        seen_dirs.add(directory)
        for file in directory.glob("*.csv"):
            try:
                with file.open(newline="", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        for col, raw_val in row.items():
                            if not col:
                                continue
                            val = (raw_val or "").strip()
                            if not val:
                                continue
                            key = col.strip().upper()
                            mapping.setdefault(key, [])
                            val_clean = val.upper()
                            if val_clean not in mapping[key]:
                                mapping[key].append(val_clean)
            except Exception:
                continue
    return mapping


def load_requirements(path: Path, special_dir: Path | None = None, *, admission_year: str | None = None) -> List[Requirement]:
    rows: List[Requirement] = []
    special_map = load_special_requirements(
        special_dir or (REQUIREMENTS_BASE / "additional_tables"), year=admission_year
    )

    def expand_special(cell: str) -> List[str]:
        token = (cell or "").strip()
        if not token:
            return []
        key = token.upper()
        if key in special_map:
            return special_map[key]
        if " " in token:
            prefix, remainder = token.split(" ", 1)
            pref_up = prefix.upper()
            remainder = remainder.strip().upper()
            if pref_up in special_map and remainder:
                expanded = [f"{val} {remainder}".strip() for val in special_map[pref_up]]
                return expanded
        return [token]

    def option_value(cell: str) -> str:
        expanded = expand_special(cell)
        if not expanded:
            return ""
        return " / ".join(expanded)

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            lowered = {k.lower(): v for k, v in raw.items()}
            course_code = (lowered.get("course_code") or "").strip()
            if not course_code:
                continue
            option_cols = [k for k in raw.keys() if k and k.lower().startswith("option")]
            option_cols.sort(key=_column_sort_key)
            options: List[str] = []
            for col in option_cols:
                val = option_value(raw.get(col) or "")
                if val:
                    options.append(val)

            must_cols = [k for k in raw.keys() if k and k.lower().startswith("must have option")]
            must_cols.sort(key=_column_sort_key)
            must_haves: List[str] = []
            for col in must_cols:
                for val in expand_special(raw.get(col) or ""):
                    if val:
                        must_haves.append(val)

            except_cols = [k for k in raw.keys() if k and k.lower().startswith("except")]
            except_cols.sort(key=_column_sort_key)
            excepts: List[str] = []
            for col in except_cols:
                for val in expand_special(raw.get(col) or ""):
                    if val:
                        excepts.extend([v.strip() for v in val.split(",") if v.strip()])

            rows.append(
                Requirement(
                    course_id=(lowered.get("course_id") or "").strip(),
                    course_code=course_code,
                    course_name=(lowered.get("course_name") or "").strip(),
                    credits_need=float(lowered.get("credits_need") or 0) if lowered.get("credits_need") else 0.0,
                    min_grade=(lowered.get("grade") or "D").strip(),
                    comments=(lowered.get("comments") or "").strip(),
                    options=options,
                    must_haves=must_haves,
                    excepts=excepts,
                )
            )
    return rows


def _normalized_code(code: str) -> str:
    cleaned = re.sub(r"\s+", " ", code.strip().upper())
    # Allow trailing dash/slash suffix like "NUR 213/C" by flattening to "NUR 213C".
    cleaned = re.sub(r"([0-9X]{3})\s*[-/]\s*([A-Z])$", r"\1\2", cleaned)
    return cleaned


def _parse_course_parts(code: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """Return (dept, number, suffix) or (None, None, None) if it doesn't look like a code."""
    m = re.match(r"^([A-Z]+)\s*([0-9X]{3})\s*([A-Z]*)$", _normalized_code(code))
    if not m:
        return None, None, None
    return m.group(1), m.group(2), m.group(3)


def _parse_range_pattern(pattern: str) -> Optional[Tuple[str, str, str]]:
    """Parse patterns like 'ANT X00-ANT X29' -> (dept, start_num, end_num)."""
    m = re.match(r"^\s*([A-Z]+)\s*([0-9X]{3})\s*-\s*([A-Z]+)\s*([0-9X]{3})\s*$", pattern.upper())
    if not m:
        return None
    if m.group(1) != m.group(3):
        return None
    return m.group(1), m.group(2), m.group(4)


def _pattern_aliases(pattern: str) -> List[str]:
    return [p.strip() for p in (pattern or "").split("/") if p and p.strip()]


def _is_excluded_course(course_code: str, excluded_patterns: Sequence[str]) -> bool:
    """Return True only if every alias of the course matches an excluded pattern."""
    if not excluded_patterns:
        return False
    course_aliases = _pattern_aliases(course_code) or [course_code]
    excluded_aliases = [
        alias for ex_pat in excluded_patterns for alias in _pattern_aliases(ex_pat) or [ex_pat]
    ]
    for alias in course_aliases:
        if not any(course_matches_pattern(alias, ex_alias) for ex_alias in excluded_aliases):
            return False
    return True


def course_matches_pattern(course_code: str, pattern: str) -> bool:
    rng = _parse_range_pattern(pattern)
    if rng:
        dept, start_num, end_num = rng
        start_min = int(start_num.replace("X", "0"))
        end_max = int(end_num.replace("X", "9"))
        for part in course_code.split("/"):
            course_dept, course_num, _ = _parse_course_parts(part.strip())
            if course_dept != dept or not course_num or not course_num.isdigit():
                continue
            num_val = int(course_num)
            if start_min <= num_val <= end_max:
                return True
        return False

    pat_dept, pat_num, pat_suffix = _parse_course_parts(pattern)
    if not pat_dept or not pat_num:
        return False
    if pat_dept == "ANY":
        return True

    num_regex = "".join(r"\d" if ch == "X" else ch for ch in pat_num)

    for part in course_code.split("/"):
        course_dept, course_num, course_suffix = _parse_course_parts(part.strip())
        if not course_dept or not course_num:
            continue
        if course_dept != pat_dept:
            continue
        if not re.fullmatch(num_regex, course_num):
            continue
        if pat_suffix:
            if course_suffix == pat_suffix:
                return True
        else:
            if course_suffix == pat_suffix or not course_suffix:
                return True

    return False


def _split_alternative_group(cell: str) -> List[str]:
    """Split a requirement cell into AND components, preserving slash-separated aliases."""
    return [part.strip() for part in cell.split(",") if part.strip()]


def _candidate_courses(
    courses: List[Course],
    remaining: List[float],
    blocked_indices: set,
    pattern: str,
    min_grade: str,
    excluded_patterns: Sequence[str],
    prefer_latest: bool = True,
) -> List[int]:
    candidates: List[int] = []
    aliases = _pattern_aliases(pattern) or [pattern]
    for idx, course in enumerate(courses):
        if idx in blocked_indices:
            continue
        if remaining[idx] <= 0:
            continue
        if is_non_applicable_grade(course.grade):
            continue
        if not grade_meets(course.grade, min_grade):
            continue
        if _is_excluded_course(course.code, excluded_patterns):
            continue
        if any(course_matches_pattern(course.code, alias) for alias in aliases):
            candidates.append(idx)
    candidates.sort(reverse=prefer_latest)
    return candidates


def _match_group(
    courses: List[Course],
    remaining: List[float],
    used_indices: set,
    patterns: Sequence[str],
    credits_needed: float,
    min_grade: str,
    excluded_patterns: Sequence[str],
) -> Tuple[bool, List[Tuple[int, float]], float, str]:
    """Try to satisfy an AND-group of patterns, consuming courses if successful."""
    temp_used: List[Tuple[int, float]] = []
    total_credits = 0.0
    patterns = list(patterns)

    def _is_bucket(p: str) -> bool:
        up = p.strip().upper()
        return "XX" in up or "XXX" in up

    # Bucket requirement like BIOL 3XX 18 credits: single pattern with XX and credit need.
    if len(patterns) == 1 and ("XX" in patterns[0] or "XXX" in patterns[0]) and credits_needed > 0:
        pat = patterns[0]
        candidates = _candidate_courses(
            courses,
            remaining,
            used_indices,
            pat,
            min_grade,
            excluded_patterns,
            prefer_latest=not pat.strip().upper().startswith("ANY"),
        )
        for idx in candidates:
            available = remaining[idx]
            consume = min(available, credits_needed - total_credits)
            if consume <= 0:
                continue
            temp_used.append((idx, consume))
            total_credits += consume
            if total_credits >= credits_needed:
                break
        if total_credits >= credits_needed:
            return True, temp_used, total_credits, ""
        return False, temp_used, total_credits, "Not enough credits in bucket"

    # Multi-pattern bucket (OR across patterns) e.g., "SOC XXX, ECON XXX, ANT XXX" with a credit target.
    if credits_needed > 0 and all(_is_bucket(pat) for pat in patterns):
        seen = set()
        combined_candidates: List[int] = []
        for pat in patterns:
            cand = _candidate_courses(
                courses,
                remaining,
                used_indices,
                pat,
                min_grade,
                excluded_patterns,
                prefer_latest=not pat.strip().upper().startswith("ANY"),
            )
            for idx in cand:
                if idx not in seen:
                    seen.add(idx)
                    combined_candidates.append(idx)
        for idx in combined_candidates:
            available = remaining[idx]
            consume = min(available, credits_needed - total_credits)
            if consume <= 0:
                continue
            temp_used.append((idx, consume))
            total_credits += consume
            if total_credits >= credits_needed:
                break
        if total_credits >= credits_needed:
            return True, temp_used, total_credits, ""
        return False, temp_used, total_credits, "Not enough credits in bucket"

    # Standard AND group
    missing: List[str] = []
    for pat in patterns:
        # Handle slash-separated aliases (OR within a component)
        aliases = [p.strip() for p in pat.split("/") if p.strip()]
        matched_idx: Optional[int] = None
        for alias in aliases:
            cand = _candidate_courses(
                courses,
                remaining,
                used_indices.union({idx for idx, _ in temp_used}),
                alias,
                min_grade,
                excluded_patterns,
                prefer_latest=not alias.strip().upper().startswith("ANY"),
            )
            if cand:
                matched_idx = cand[0]
                break
        if matched_idx is None:
            missing.append(pat)
            continue
        available = remaining[matched_idx]
        consume = min(available, credits_needed - total_credits) if credits_needed > 0 else available
        temp_used.append((matched_idx, consume))
        total_credits += consume

    # If credits_needed is specified for fixed-course groups, ensure threshold.
    if missing or (credits_needed and total_credits < credits_needed):
        note = f"Missing {missing[0]}" if missing else "Insufficient credits"
        return False, temp_used, total_credits, note

    return True, temp_used, total_credits, ""


def audit_transcript(transcript: Transcript, requirements: List[Requirement], expected_major: str) -> List[RequirementResult]:
    # We no longer block audits on major mismatch; allow auditing any transcript against any major.

    def pattern_priority(pattern: str) -> Tuple[int, int]:
        pat = pattern.strip().upper()
        if pat.startswith("ANY"):
            return (1, 0)
        return (0, 0)

    def requirement_priority(req: Requirement, original_index: int) -> Tuple[int, int, int]:
        primary_source = req.options[0] if req.options else req.course_code
        primary_patterns = _split_alternative_group(primary_source) if primary_source else []
        primary = primary_patterns[0] if primary_patterns else ""
        pri = pattern_priority(primary)
        return (pri[0], pri[1], original_index)

    ordered_reqs = [r for r in requirements if r.course_code.strip()]  # keep only with course codes
    ordered_reqs = [
        r
        for _, r in sorted(
            [(requirement_priority(r, idx), r) for idx, r in enumerate(ordered_reqs)],
            key=lambda x: x[0],
        )
    ]

    # Keep only last attempt per course code.
    all_courses: List[Course] = []
    for sem in transcript.semesters:
        all_courses.extend(sem.courses)

    # Handle repeats: if a course is marked as retaken (grade contains **), keep only the latest attempt.
    # Otherwise, keep all occurrences (some courses are intentionally taken multiple times).
    by_code: Dict[str, List[int]] = {}
    for idx, course in enumerate(all_courses):
        by_code.setdefault(_normalized_code(course.code), []).append(idx)

    keep_indices: set[int] = set()
    for code, idxs in by_code.items():
        has_retake_flag = any("**" in (all_courses[i].grade or "") for i in idxs)
        if has_retake_flag:
            keep_indices.add(idxs[-1])
        else:
            keep_indices.update(idxs)

    courses: List[Course] = [c for idx, c in enumerate(all_courses) if idx in keep_indices]

    remaining_credits = [c.credits for c in courses]
    used_indices: set = set()
    reserved_indices: set = set()
    results: List[RequirementResult] = []

    for req in ordered_reqs:
        # Build alternatives. For credit buckets with only bucket-style patterns, pool them into one OR-bucket.
        options_split = [_split_alternative_group(opt) for opt in req.options] if req.options else []
        def is_bucket_pattern(pat: str) -> bool:
            up = pat.upper()
            return "XX" in up or "XXX" in up
        if req.credits_need > 0 and options_split and all(is_bucket_pattern(p) for group in options_split for p in group):
            alternatives: List[List[str]] = [[p for group in options_split for p in group]]
        else:
            alternatives = options_split if options_split else []
            if not alternatives and req.course_code:
                alternatives.append(_split_alternative_group(req.course_code))

        matched = False
        best_used: List[Tuple[int, float]] = []
        credits_applied = 0.0
        best_partial_used: List[Tuple[int, float]] = []
        best_partial_credits = 0.0
        note = ""
        is_any_bucket = req.course_code.strip().upper().startswith("ANY")

        for alt in alternatives:
            ok, temp_used, creds, alt_note = _match_group(
                courses,
                remaining_credits,
                used_indices.union(reserved_indices),
                alt,
                req.credits_need,
                req.min_grade,
                req.excepts,
            )
            if ok and req.must_haves:
                has_must = False
                for idx, _ in temp_used:
                    for must_pat in req.must_haves:
                        if any(course_matches_pattern(courses[idx].code, alias) for alias in _pattern_aliases(must_pat)):
                            has_must = True
                            break
                    if has_must:
                        break
                if not has_must:
                    ok = False
                    alt_note = "Missing must-have option"
                    temp_used = []
                    creds = 0.0
            if ok:
                matched = True
                best_used = temp_used
                credits_applied = creds
                note = "Satisfied via option" if alt != alternatives[0] else ""
                break
            else:
                if creds > best_partial_credits:
                    best_partial_credits = creds
                    best_partial_used = temp_used
                if not note:
                    note = alt_note

        if matched:
            for idx, consume in best_used:
                remaining_credits[idx] -= consume
                if remaining_credits[idx] <= 0:
                    used_indices.add(idx)
            status = "Satisfied"
            credits_remaining = max(req.credits_need - credits_applied, 0.0)
        else:
            status = "Pending"
            credits_applied = best_partial_credits
            best_used = best_partial_used
            credits_remaining = max(req.credits_need - credits_applied, 0.0)
            for idx, consume in best_used:
                remaining_credits[idx] -= consume
                if remaining_credits[idx] <= 0:
                    used_indices.add(idx)

        used_codes = [f"{courses[i].code} ({format_credit(consumed)} credits)" for i, consumed in best_used]
        results.append(
            RequirementResult(
                requirement=req,
                status=status,
                used_courses=used_codes,
                credits_applied=credits_applied,
                credits_remaining=credits_remaining,
                note=note,
            )
        )

        # If a requirement has only a single explicit option, reserve matching courses for later rows.
        if len(alternatives) == 1 and len(alternatives[0]) == 1:
            pattern = alternatives[0][0].strip()
            if pattern and "XX" not in pattern.upper() and not pattern.upper().startswith("ANY"):
                aliases = _pattern_aliases(pattern)
                for idx, course in enumerate(courses):
                    if idx in used_indices or idx in reserved_indices:
                        continue
                    if is_non_applicable_grade(course.grade):
                        continue
                    if remaining_credits[idx] <= 0:
                        continue
                    if any(course_matches_pattern(course.code, alias) for alias in aliases):
                        continue

    return results


def _totals_row(summary: Dict[str, str] | None) -> Optional[Dict[str, object]]:
    if not summary:
        return None
    return {
        "course_code": "TOTALS",
        "course_name": "",
        "credits_required": summary.get("total_required", ""),
        "min_grade": "",
        "status": "",
        "used_courses": "",
        "credits_applied": summary.get("total_applied", ""),
        "credits_remaining": summary.get("total_remaining", ""),
        "note": f"Credits taken: {summary.get('total_taken', '')}",
    }


def write_audit_csv(results: Iterable[RequirementResult], path: Path, summary: Dict[str, str] | None = None) -> None:
    fieldnames = [
        "course_code",
        "course_name",
        "credits_required",
        "min_grade",
        "status",
        "used_courses",
        "credits_applied",
        "credits_remaining",
        "note",
    ]
    totals_row = _totals_row(summary)
    status_order = {"Satisfied": 0, "Pending": 1}
    ordered = sorted(
        enumerate(results),
        key=lambda pair: (status_order.get(pair[1].status, 99), pair[0]),
    )
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for _, res in ordered:
            writer.writerow(
                {
                    "course_code": res.requirement.course_code,
                    "course_name": res.requirement.course_name,
                    "credits_required": res.requirement.credits_need,
                    "min_grade": res.requirement.min_grade,
                    "status": res.status,
                    "used_courses": "; ".join(res.used_courses),
                    "credits_applied": res.credits_applied,
                    "credits_remaining": res.credits_remaining,
                    "note": res.note or res.requirement.comments,
                }
            )
        if totals_row:
            writer.writerow(totals_row)


def audit_results_to_csv_string(results: Iterable[RequirementResult], summary: Dict[str, str] | None = None) -> str:
    """Serialize audit results to a CSV string (same ordering as write_audit_csv)."""
    fieldnames = [
        "course_code",
        "course_name",
        "credits_required",
        "min_grade",
        "status",
        "used_courses",
        "credits_applied",
        "credits_remaining",
        "note",
    ]
    status_order = {"Satisfied": 0, "Pending": 1}
    ordered = sorted(
        enumerate(results),
        key=lambda pair: (status_order.get(pair[1].status, 99), pair[0]),
    )
    totals_row = _totals_row(summary)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames)
    writer.writeheader()
    for _, res in ordered:
        writer.writerow(
            {
                "course_code": res.requirement.course_code,
                "course_name": res.requirement.course_name,
                "credits_required": format_credit(res.requirement.credits_need),
                "min_grade": res.requirement.min_grade,
                "status": res.status,
                "used_courses": "; ".join(res.used_courses),
                "credits_applied": format_credit(res.credits_applied),
                "credits_remaining": format_credit(res.credits_remaining),
                "note": res.note or res.requirement.comments,
            }
        )
    if totals_row:
        writer.writerow(totals_row)
    return buf.getvalue()
