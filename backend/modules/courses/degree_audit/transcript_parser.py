from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from pypdf import PdfReader
import tempfile

SEMESTER_HEADER_RE = re.compile(r"^(Fall|Spring|Summer|Winter)\s+\d{4}$")
COURSE_CODE_RE = re.compile(
    r"^([A-Z]{2,4}\s*\d{3}[A-Z]?(?:[-/][A-Z])?)(?:/[A-Z]{2,4}\s*\d{3}[A-Z]?(?:[-/][A-Z])?)*\b"
)
COURSE_RE = re.compile(
    r"^([A-Z]{2,4}\s*\d{3}[A-Z]?(?:[-/][A-Z])?(?:/[A-Z]{2,4}\s*\d{3}[A-Z]?(?:[-/][A-Z])?)*?)\s+"
    r"(.*?)\s+"
    r"((?:PASS|FAIL)|[A-Z]{1,3}[+-]?\*{0,2})\s+"
    r"(\d+(?:\.\d+)?)\s+"
    r"(\d+(?:\.\d+)?|[Nn]/?[Aa])$"
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


def parse_metadata(lines: List[str]) -> Tuple[Dict[str, str], int]:
    """Grab key/value metadata before the first semester heading."""
    first_semester_index = next(
        (i for i, line in enumerate(lines) if SEMESTER_HEADER_RE.match(line)), len(lines)
    )
    metadata_lines = lines[:first_semester_index]
    metadata: Dict[str, str] = {}
    for line in metadata_lines:
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip()
    return metadata, first_semester_index


def find_semester_spans(lines: List[str]) -> List[Tuple[str, int, int]]:
    """Return (semester name, start index after header, end index) spans."""
    semester_indices = [
        (i, SEMESTER_HEADER_RE.match(line).group(0))
        for i, line in enumerate(lines)
        if SEMESTER_HEADER_RE.match(line)
    ]
    overall_index = next(
        (i for i, line in enumerate(lines) if line.startswith("Overall")), len(lines)
    )
    spans: List[Tuple[str, int, int]] = []
    for idx, (start, name) in enumerate(semester_indices):
        end = semester_indices[idx + 1][0] if idx + 1 < len(semester_indices) else overall_index
        spans.append((name, start + 1, end))
    return spans


def is_header_line(line: str) -> bool:
    return line in {
        "Course Code Course Title Grade Credits",
        "ECTS",
        "Grade",
        "Points",
    }


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
    code, title, grade, credits, grade_points_raw = match.groups()
    try:
        grade_points = float(grade_points_raw)
    except Exception:
        grade_points = 0.0
    return Course(
        code=code.strip(),
        title=title.strip(),
        grade=grade.strip(),
        credits=float(credits),
        grade_points=grade_points,
    )


def parse_gpa_block(lines: List[str]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    if not lines:
        return None, None, None
    blob = " ".join(lines)
    sem_gpa = _extract_number(blob, r"Semester GPA:\s*([0-9.]+)")
    credits_enrolled = _extract_number(blob, r"Credits Enrolled:\s*([0-9.]+)")
    credits_earned = _extract_number(blob, r"Credits Earned:\s*([0-9.]+)")
    return sem_gpa, credits_enrolled, credits_earned


def _extract_number(blob: str, pattern: str) -> Optional[float]:
    match = re.search(pattern, blob)
    return float(match.group(1)) if match else None


def parse_semester_block(name: str, lines: List[str]) -> Semester:
    gpa_index = next((i for i, line in enumerate(lines) if line.startswith("Semester GPA")), len(lines))
    course_lines = [line for line in lines[:gpa_index] if not is_header_line(line)]
    segments = split_course_segments(course_lines)
    courses = [parse_course_segment(segment) for segment in segments]
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
    if overall_index is None or overall_index + 1 >= len(lines):
        return None, None, None
    blob = " ".join(lines[overall_index : overall_index + 2])
    overall_gpa = _extract_number(blob, r"GPA:\s*([0-9.]+)")
    overall_enrolled = _extract_number(blob, r"Credits Enrolled:\s*([0-9.]+)")
    overall_earned = _extract_number(blob, r"Credits Earned:\s*([0-9.]+)")
    return overall_gpa, overall_enrolled, overall_earned


def parse_transcript(pdf_path: str | Path) -> Transcript:
    lines = extract_lines(pdf_path)
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
