from __future__ import annotations

import re
import tempfile
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pypdf import PdfReader

SEMESTER_HEADER_RE = re.compile(
    r"^(Fall|Spring|Summer|Winter)\s+(\d{4})(?:\s+Grd\s+ECTS\s+QPts)?$",
    re.IGNORECASE,
)
METADATA_KEY_RE = re.compile(r"^([A-Za-z][A-Za-z0-9 #/]*?):\s*(.*)$")
STUDENT_ID_RE = re.compile(r"^ID#\s*(\S+)$", re.IGNORECASE)
PAGE_STAMP_RE = re.compile(r"^\d{2}-\d{2}-\d{4}\b")

# Dept + number, optional section letter (MATH 161A). A following cross-list
# (/WCS 260, including codes broken across PDF lines) wins over a one-letter
# suffix such as NUR 213/C.
_DEPT_NUM = r"[A-Z]{2,4}\s*\d{3}[A-Z]?"
_SECTION_SUFFIX = r"(?:[-/][A-Z])"
_CROSS_LIST = rf"(?:/{_DEPT_NUM}{_SECTION_SUFFIX}?)"
_REGULAR_CODE = rf"{_DEPT_NUM}(?:{_CROSS_LIST}+|{_SECTION_SUFFIX}?)?"
_TRANSFER_CODE = r"T\s*-\s*[A-Z]{2,5}\s*\d{3,4}[A-Z]?"
_COURSE_CODE = rf"(?:{_TRANSFER_CODE}|{_REGULAR_CODE})"
_GRADE = r"(?:PASS|FAIL|TC|[A-Z]{1,3}[+-]?(?:\*{1,2})?)"
_CREDITS = r"\d+(?:\.\d+)?"
_GRADE_POINTS = r"(?:\d+(?:\.\d+)?|[Nn]/?[Aa])"

COURSE_CODE_RE = re.compile(rf"^({_REGULAR_CODE})\b")
COURSE_START_RE = re.compile(rf"(?:^|\s)(?P<code>{_COURSE_CODE})(?=\s)")
COURSE_SEGMENT_RE = re.compile(
    rf"^(?P<code>{_COURSE_CODE})\s+(?P<title>.*?)\s+(?P<grade>{_GRADE})\s+"
    rf"(?P<credits>{_CREDITS})\s+(?P<points>{_GRADE_POINTS})$"
)
COURSE_RE = re.compile(
    rf"^({_REGULAR_CODE})\s+(.*?)\s+({_GRADE})\s+({_CREDITS})\s+({_GRADE_POINTS})$"
)
COURSE_ENTRY_RE = re.compile(
    rf"({_REGULAR_CODE})\s+(.*?)\s+({_GRADE})\s+({_CREDITS})\s+({_GRADE_POINTS})"
    rf"(?=\s+(?:{_COURSE_CODE})\s+|\s*$)"
)
TRANSFER_COURSE_RE = re.compile(
    rf"^T\s*-\s*([A-Z]{{2,5}}\s*\d{{3,4}}[A-Z]?)\s+(.*?)\s+({_GRADE})\s+"
    rf"({_CREDITS})\s+({_GRADE_POINTS})$"
)


@dataclass
class Course:
    code: str
    title: str
    grade: str
    credits: float
    grade_points: float


@dataclass
class Semester:
    name: str
    courses: List[Course]
    semester_gpa: Optional[float]
    credits_enrolled: Optional[float]
    credits_earned: Optional[float]


@dataclass
class Transcript:
    metadata: Dict[str, str]
    semesters: List[Semester]
    overall_gpa: Optional[float]
    overall_credits_enrolled: Optional[float]
    overall_credits_earned: Optional[float]


def extract_lines(pdf_path: str | Path) -> List[str]:
    """Extract text from the PDF and return it as cleaned lines."""
    path = Path(pdf_path)
    reader = PdfReader(str(path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return [line.strip() for line in text.splitlines() if line.strip()]


def _semester_name(match: re.Match[str]) -> str:
    return f"{match.group(1).title()} {match.group(2)}"


def parse_metadata(lines: List[str]) -> Tuple[Dict[str, str], int]:
    """Grab key/value metadata before the first semester heading.

    Wrapped values (a major or program name split by the PDF extractor) are
    appended to the previous field. Page stamps and ``ID#`` rows are handled
    even though they are not ``Key: Value`` lines.
    """
    first_semester_index = next(
        (i for i, line in enumerate(lines) if SEMESTER_HEADER_RE.match(line)), len(lines)
    )
    metadata: Dict[str, str] = {}
    last_key: Optional[str] = None
    for line in lines[:first_semester_index]:
        if PAGE_STAMP_RE.match(line) or re.fullmatch(r"\d+/\d+", line):
            continue
        student_id = STUDENT_ID_RE.match(line)
        if student_id:
            metadata["ID#"] = student_id.group(1)
            last_key = "ID#"
            continue
        key_match = METADATA_KEY_RE.match(line)
        if key_match:
            key = key_match.group(1).strip()
            metadata[key] = key_match.group(2).strip()
            last_key = key
            continue
        if last_key and line:
            metadata[last_key] = f"{metadata[last_key]} {line}".strip()
    return metadata, first_semester_index


def find_semester_spans(lines: List[str]) -> List[Tuple[str, int, int]]:
    """Return (semester name, start index after header, end index) spans."""
    semester_indices = [
        (i, _semester_name(match))
        for i, line in enumerate(lines)
        if (match := SEMESTER_HEADER_RE.match(line))
    ]
    overall_index = next(
        (
            i
            for i, line in enumerate(lines)
            if line.startswith("Overall")
            or line.startswith("Cumulative GPA")
            or "END OF TRANSCRIPT" in line
        ),
        len(lines),
    )
    spans: List[Tuple[str, int, int]] = []
    for idx, (start, name) in enumerate(semester_indices):
        end = semester_indices[idx + 1][0] if idx + 1 < len(semester_indices) else overall_index
        spans.append((name, start + 1, end))
    return spans


def is_header_line(line: str) -> bool:
    normalized = re.sub(r"\s+", " ", line.strip()).lower()
    return normalized in {
        "course code course title grade credits",
        "ects",
        "grade",
        "points",
        "grd ects qpts",
    }


def is_ignorable_course_line(line: str) -> bool:
    """Drop column headers, transfer banners, footnotes, and closing remarks."""
    if is_header_line(line):
        return True
    lowered = line.strip().lower()
    return (
        lowered.startswith("transferred courses from")
        or lowered.startswith("cumulative gpa")
        or lowered.startswith("on academic leave")
        or lowered.startswith("*")
        or "end of transcript" in lowered
    )


def split_course_segments(lines: List[str]) -> List[List[str]]:
    """Group raw lines into per-course chunks."""
    segments: List[List[str]] = []
    current: List[str] = []
    for line in lines:
        if COURSE_CODE_RE.match(line):
            if current:
                segments.append(current)
            current = [line]
        elif current:
            current.append(line)
    if current:
        segments.append(current)
    return segments


def parse_course_segment(segment: List[str]) -> Course:
    combined = " ".join(part.strip() for part in segment if part.strip())
    combined = re.sub(r"\s+", " ", combined)
    match = COURSE_RE.match(combined)
    if not match:
        raise ValueError(f"Could not parse course segment: {combined}")
    return _build_course(*match.groups())


def _normalize_course_code(code: str) -> str:
    """Collapse PDF whitespace and drop the ``T -`` transfer prefix."""
    cleaned = re.sub(r"\s+", " ", code).strip()
    return re.sub(r"^T\s*-\s*", "", cleaned, flags=re.IGNORECASE)


def _build_course(code: str, title: str, grade: str, credits: str, grade_points_raw: str) -> Course:
    try:
        grade_points = float(grade_points_raw)
    except Exception:
        grade_points = 0.0
    return Course(
        code=_normalize_course_code(code),
        title=re.sub(r"\s+", " ", title).strip(),
        grade=grade.strip(),
        credits=float(credits),
        grade_points=grade_points,
    )


def parse_courses(course_lines: List[str]) -> List[Course]:
    """Parse course rows, including PDF-extracted lines that contain multiple courses."""
    courses: List[Course] = []
    regular_buffer: List[str] = []
    for raw_line in course_lines:
        line = re.sub(r"\s+", " ", raw_line.strip())
        if not line:
            continue
        transfer_match = TRANSFER_COURSE_RE.match(line)
        if transfer_match:
            if regular_buffer:
                courses.extend(_parse_regular_courses(regular_buffer))
                regular_buffer = []
            code, title, grade, credits, grade_points = transfer_match.groups()
            courses.append(_build_course(code, title, grade, credits, grade_points))
            continue
        regular_buffer.append(line)

    if regular_buffer:
        courses.extend(_parse_regular_courses(regular_buffer))
    return courses


def _parse_regular_courses(course_lines: List[str]) -> List[Course]:
    blob = " ".join(line.strip() for line in course_lines if line.strip())
    blob = re.sub(r"\s+", " ", blob).strip()
    if not blob:
        return []

    courses = _parse_course_blob(blob)
    if courses is not None:
        return courses

    matches = list(COURSE_ENTRY_RE.finditer(blob))
    if matches:
        return [_build_course(*match.groups()) for match in matches]

    segments = split_course_segments(course_lines)
    return [parse_course_segment(segment) for segment in segments]


def _parse_course_blob(blob: str) -> Optional[List[Course]]:
    """Split a flattened semester on course-code starts.

    Returns None when a slice does not end in grade / credits / points, so the
    caller can fall back to the older line-oriented parser.
    """
    starts = [match.start("code") for match in COURSE_START_RE.finditer(blob)]
    if not starts:
        return None

    courses: List[Course] = []
    for index, start in enumerate(starts):
        end = starts[index + 1] if index + 1 < len(starts) else len(blob)
        segment = blob[start:end].strip()
        match = COURSE_SEGMENT_RE.match(segment)
        if not match:
            return None
        courses.append(_build_course(*match.groups()))
    return courses


def parse_gpa_block(lines: List[str]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    if not lines:
        return None, None, None
    blob = " ".join(lines)
    # Current registrar layout:
    # Semester AttCr: 30 Cr: 30 GPA: 3.40 | Cumulative Cr: 30 GPA: 3.40
    if "Semester AttCr" in blob:
        credits_enrolled = _extract_number(blob, r"Semester AttCr:\s*([0-9.]+)")
        credits_earned = _extract_number(blob, r"Semester AttCr:\s*[0-9.]+\s*Cr:\s*([0-9.]+)")
        sem_gpa = _extract_number(
            blob, r"Semester AttCr:\s*[0-9.]+\s*Cr:\s*[0-9.]+\s*GPA:\s*([0-9.]+)"
        )
        return sem_gpa, credits_enrolled, credits_earned
    sem_gpa = _extract_number(blob, r"Semester GPA:\s*([0-9.]+)")
    credits_enrolled = _extract_number(blob, r"Credits Enrolled:\s*([0-9.]+)")
    credits_earned = _extract_number(blob, r"Credits Earned:\s*([0-9.]+)")
    return sem_gpa, credits_enrolled, credits_earned


def _extract_number(blob: str, pattern: str) -> Optional[float]:
    match = re.search(pattern, blob)
    return float(match.group(1)) if match else None


def _is_semester_summary_line(line: str) -> bool:
    return line.startswith("Semester GPA") or line.startswith("Semester AttCr")


def parse_semester_block(name: str, lines: List[str]) -> Semester:
    gpa_index = next(
        (i for i, line in enumerate(lines) if _is_semester_summary_line(line)), len(lines)
    )
    course_lines = [line for line in lines[:gpa_index] if not is_ignorable_course_line(line)]
    courses = parse_courses(course_lines)
    gpa_block = lines[gpa_index:] if gpa_index < len(lines) else []
    sem_gpa, credits_enrolled, credits_earned = parse_gpa_block(gpa_block)
    return Semester(
        name=name,
        courses=courses,
        semester_gpa=sem_gpa,
        credits_enrolled=credits_enrolled,
        credits_earned=credits_earned,
    )


def parse_overall(lines: List[str]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    overall_index = next((i for i, line in enumerate(lines) if line.startswith("Overall")), None)
    if overall_index is not None and overall_index + 1 < len(lines):
        blob = " ".join(lines[overall_index : overall_index + 2])
        overall_gpa = _extract_number(blob, r"GPA:\s*([0-9.]+)")
        overall_enrolled = _extract_number(blob, r"Credits Enrolled:\s*([0-9.]+)")
        overall_earned = _extract_number(blob, r"Credits Earned:\s*([0-9.]+)")
        if any(value is not None for value in (overall_gpa, overall_enrolled, overall_earned)):
            return overall_gpa, overall_enrolled, overall_earned

    blob = " ".join(lines)
    overall_gpa = _extract_number(blob, r"Cumulative GPA:\s*([0-9.]+)")
    earned_matches = re.findall(r"Cumulative Cr:\s*([0-9.]+)", blob)
    overall_earned = float(earned_matches[-1]) if earned_matches else None
    return overall_gpa, None, overall_earned


def parse_transcript_lines(lines: List[str]) -> Transcript:
    metadata, first_semester_index = parse_metadata(lines)
    spans = find_semester_spans(lines[first_semester_index:])
    semesters: List[Semester] = []
    for name, start, end in spans:
        adjusted_start = first_semester_index + start
        adjusted_end = first_semester_index + end
        semester_lines = lines[adjusted_start:adjusted_end]
        semesters.append(parse_semester_block(name, semester_lines))
    overall_gpa, overall_enrolled, overall_earned = parse_overall(lines)
    return Transcript(
        metadata=metadata,
        semesters=semesters,
        overall_gpa=overall_gpa,
        overall_credits_enrolled=overall_enrolled,
        overall_credits_earned=overall_earned,
    )


def parse_transcript(pdf_path: str | Path) -> Transcript:
    return parse_transcript_lines(extract_lines(pdf_path))


def parse_transcript_bytes(pdf_bytes: bytes) -> Transcript:
    """Convenience helper: parse transcript from PDF bytes."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(pdf_bytes)
        tmp_path = Path(tmp.name)
    try:
        return parse_transcript(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)


def transcript_to_dict(transcript: Transcript) -> Dict[str, object]:
    """Utility for serializing dataclasses to a JSON-friendly dict."""
    return asdict(transcript)


def transcript_courses_rows(transcript: Transcript) -> List[Dict[str, object]]:
    """Flatten courses into per-row dicts for CSV export."""
    rows: List[Dict[str, object]] = []
    for semester in transcript.semesters:
        for course in semester.courses:
            rows.append(
                {
                    "semester": semester.name,
                    "course_code": course.code,
                    "course_title": course.title,
                    "grade": course.grade,
                    "credits": course.credits,
                    "grade_points": course.grade_points,
                    "semester_gpa": semester.semester_gpa,
                    "semester_credits_enrolled": semester.credits_enrolled,
                    "semester_credits_earned": semester.credits_earned,
                }
            )
    return rows
