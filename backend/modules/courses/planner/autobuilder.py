from __future__ import annotations

import random
import re
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from backend.core.database.models.grade_report import (
    PlannerSchedule,
    PlannerScheduleCourse,
    PlannerScheduleSection,
)
MAX_SECTION_COMBINATIONS = 200
MAX_ASSIGNMENT_CANDIDATES = 32

DAY_TO_INDEX = {"M": 0, "T": 1, "W": 2, "R": 3, "F": 4, "S": 5, "U": 6}
TIME_PATTERN = re.compile(
    r"(?P<hour>\d{1,2}):(?P<minute>\d{2})\s*(?P<mod>[AP]M)", re.IGNORECASE
)


@dataclass
class SectionSlot:
    section_ids: tuple[int, ...]
    course_id: int
    label: str
    blocks: List[tuple]


@dataclass
class AutoBuildResult:
    assignments: Dict[int, Tuple[int, ...]]
    unscheduled_courses: List[str]
    message: str

    def get(self, key: int) -> Optional[Tuple[int, ...]]:
        return self.assignments.get(key)


class PlannerAutoBuilder:
    def build(self, schedule: PlannerSchedule) -> AutoBuildResult:
        return self._run_autobuilder(schedule)

    def _run_autobuilder(self, schedule: PlannerSchedule) -> AutoBuildResult:
        courses = schedule.courses
        if not courses:
            return AutoBuildResult(
                assignments={},
                unscheduled_courses=[],
                message="No courses to schedule",
            )

        options: Dict[int, List[SectionSlot]] = {}
        for course in courses:
            options[course.id] = self._build_section_slots(course)

        occupancy: Dict[int, List[tuple]] = defaultdict(list)
        course_ids = list(options.keys())
        random.shuffle(course_ids)
        random.shuffle(course_ids)
        assignments: Dict[int, Tuple[int, ...]] = {}
        best_assignment_candidates: List[Dict[int, Tuple[int, ...]]] = []
        best_size = 0
        total_courses = len(course_ids)
        stop_search = False

        def backtrack(index: int) -> None:
            nonlocal best_assignment_candidates, best_size, stop_search
            if stop_search:
                return
            if index >= len(course_ids):
                current_size = len(assignments)
                if current_size == 0:
                    return
                if current_size > best_size:
                    best_size = current_size
                    best_assignment_candidates = [assignments.copy()]
                elif current_size == best_size:
                    candidate = assignments.copy()
                    if len(best_assignment_candidates) < MAX_ASSIGNMENT_CANDIDATES:
                        best_assignment_candidates.append(candidate)
                    else:
                        replace_idx = random.randrange(MAX_ASSIGNMENT_CANDIDATES)
                        best_assignment_candidates[replace_idx] = candidate
                if (
                    best_size == total_courses
                    and len(best_assignment_candidates) >= MAX_ASSIGNMENT_CANDIDATES
                ):
                    stop_search = True
                return

            course_id = course_ids[index]
            slots = options[course_id]
            for slot in slots:
                if not slot.blocks:
                    continue
                if self._conflicts(slot, occupancy):
                    continue
                assignments[course_id] = slot.section_ids
                self._add_slot(slot, occupancy)
                backtrack(index + 1)
                self._remove_slot(slot, occupancy)
                assignments.pop(course_id, None)

            backtrack(index + 1)

        backtrack(0)

        chosen_assignments: Dict[int, Tuple[int, ...]] = {}
        if best_assignment_candidates:
            unique_candidates: Dict[
                Tuple[Tuple[int, Tuple[int, ...]], ...], Dict[int, Tuple[int, ...]]
            ] = {}
            for candidate in best_assignment_candidates:
                key = tuple(
                    sorted(
                        (course_id, tuple(section_ids))
                        for course_id, section_ids in candidate.items()
                    )
                )
                unique_candidates.setdefault(key, candidate)
            chosen_assignments = random.choice(list(unique_candidates.values()))

        unscheduled = [
            course.course_code
            for course in courses
            if course.id not in chosen_assignments
            or not chosen_assignments[course.id]
        ]
        message = (
            "shuffle completed with partial schedule"
            if unscheduled and len(unscheduled) < len(courses)
            else (
                "shuffle scheduled all courses"
                if not unscheduled
                else "Unable to schedule any course"
            )
        )

        return AutoBuildResult(
            assignments=chosen_assignments,
            unscheduled_courses=unscheduled,
            message=message,
        )

    def _build_section_slots(self, course: PlannerScheduleCourse) -> List[SectionSlot]:
        available_sections = [
            section for section in course.sections if not self._is_section_full(section)
        ]
        if not available_sections:
            return []

        grouped = self._group_sections_by_type(available_sections)
        if not grouped:
            return []

        slots: List[SectionSlot] = []
        for combo in self._build_section_combinations(grouped):
            slot = self._build_slot_from_sections(combo)
            if slot is not None:
                slots.append(slot)
        return slots

    def _group_sections_by_type(
        self, sections: Iterable[PlannerScheduleSection]
    ) -> Dict[str, List[PlannerScheduleSection]]:
        grouped: Dict[str, List[PlannerScheduleSection]] = {}
        for section in sections:
            key = self._section_type_key(section.section_code)
            grouped.setdefault(key, []).append(section)
        for key in grouped:
            random.shuffle(grouped[key])
        return grouped

    def _build_section_combinations(
        self,
        grouped: Dict[str, List[PlannerScheduleSection]],
        limit: Optional[int] = MAX_SECTION_COMBINATIONS,
    ) -> List[List[PlannerScheduleSection]]:
        if not grouped:
            return []
        ordered = list(grouped.items())
        random.shuffle(ordered)
        combos: List[List[PlannerScheduleSection]] = []
        current: List[PlannerScheduleSection] = []

        def backtrack(idx: int) -> None:
            if limit is not None and len(combos) >= limit:
                return
            if idx >= len(ordered):
                combos.append(list(current))
                return
            _, sections = ordered[idx]
            shuffled_sections = list(sections)
            random.shuffle(shuffled_sections)
            for section in shuffled_sections:
                current.append(section)
                backtrack(idx + 1)
                current.pop()
                if limit is not None and len(combos) >= limit:
                    break

        backtrack(0)
        random.shuffle(combos)
        return combos

    def _build_slot_from_sections(
        self, sections: Sequence[PlannerScheduleSection]
    ) -> Optional[SectionSlot]:
        if not sections:
            return None

        per_day_blocks: Dict[int, List[tuple]] = defaultdict(list)
        blocks: List[tuple] = []
        for section in sections:
            days = [char for char in section.days if char.upper() in DAY_TO_INDEX]
            start_minutes, end_minutes = self._parse_time_range(section.times)
            if start_minutes is None or end_minutes is None:
                return None
            for day_char in days:
                day_idx = DAY_TO_INDEX[day_char.upper()]
                for existing_start, existing_end in per_day_blocks[day_idx]:
                    if not (end_minutes <= existing_start or start_minutes >= existing_end):
                        return None
                per_day_blocks[day_idx].append((start_minutes, end_minutes))
                blocks.append((day_idx, start_minutes, end_minutes))
        if not blocks:
            return None
        label = " / ".join([section.section_code or "Section" for section in sections])
        return SectionSlot(
            section_ids=tuple(section.id for section in sections),
            course_id=sections[0].planner_schedule_course_id,
            label=label,
            blocks=blocks,
        )

    @staticmethod
    def _section_type_key(section_code: Optional[str]) -> str:
        if not section_code:
            return "SECTION"
        letters = re.sub(r"[\d\s]+", "", section_code).upper()
        return letters or "SECTION"

    @staticmethod
    def _is_section_full(section: PlannerScheduleSection) -> bool:
        capacity = section.capacity
        enrollment = section.enrollment_snapshot
        if capacity is None:
            return False
        if enrollment is None:
            return False
        return enrollment >= capacity

    @staticmethod
    def _conflicts(slot: SectionSlot, occupancy: Dict[int, List[tuple]]) -> bool:
        for day_idx, start, end in slot.blocks:
            for existing_start, existing_end in occupancy.get(day_idx, []):
                if not (end <= existing_start or start >= existing_end):
                    return True
        return False

    @staticmethod
    def _add_slot(slot: SectionSlot, occupancy: Dict[int, List[tuple]]) -> None:
        for day_idx, start, end in slot.blocks:
            occupancy[day_idx].append((start, end))

    @staticmethod
    def _remove_slot(slot: SectionSlot, occupancy: Dict[int, List[tuple]]) -> None:
        for day_idx, start, end in slot.blocks:
            try:
                occupancy[day_idx].remove((start, end))
            except ValueError:
                continue

    @staticmethod
    def _time_to_minutes(value: str) -> Optional[int]:
        value = (value or "").strip()
        if not value:
            return None
        match = TIME_PATTERN.search(value)
        if not match:
            return None
        hour = int(match.group("hour"))
        minute = int(match.group("minute"))
        modifier = match.group("mod").upper()
        if modifier == "AM":
            hour = hour % 12
        else:
            hour = (hour % 12) + 12
        return hour * 60 + minute

    def _parse_time_range(self, value: str) -> tuple[Optional[int], Optional[int]]:
        if not value:
            return None, None
        if "-" not in value:
            return self._time_to_minutes(value), None
        start_raw, end_raw = value.split("-", 1)
        start = self._time_to_minutes(start_raw.strip())
        end = self._time_to_minutes(end_raw.strip())
        return start, end

