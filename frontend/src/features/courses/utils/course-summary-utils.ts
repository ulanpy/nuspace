import type { BaseCourseItem, RegisteredCourse, ScheduleResponse } from "../types";
import { hasCompleteScore } from "../utils/grade-utils";

export function getProfessorForCourse(
  schedule: ScheduleResponse | null,
  courseCode: string,
): string | null {
  if (!schedule) return null;
  const normalized = courseCode.trim().toUpperCase();
  for (const day of schedule.data) {
    for (const item of day) {
      if (item.course_code.trim().toUpperCase() === normalized && item.teacher?.trim()) {
        return item.teacher.trim();
      }
    }
  }
  return null;
}

export function getEarnedGradeSummary(items: BaseCourseItem[]) {
  const totalWeight = items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
  const scale = Math.max(100, totalWeight) || 100;

  const scoredItems = items.filter(hasCompleteScore);
  const earnedWeight = scoredItems.reduce((acc, item) => {
    const weight = item.total_weight_pct || 0;
    return acc + weight * (item.obtained_score / item.max_score);
  }, 0);

  if (items.length === 0) {
    return { percent: 0, earnedLabel: "0%", barPercent: 0 };
  }

  return {
    percent: earnedWeight,
    earnedLabel: `${earnedWeight.toFixed(0)}%`,
    barPercent: Math.min(100, (earnedWeight / scale) * 100),
  };
}

export function getAssignmentProgress(items: BaseCourseItem[]) {
  const totalWeight = items.reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
  const completedWeight = items
    .filter(hasCompleteScore)
    .reduce((acc, item) => acc + (item.total_weight_pct || 0), 0);
  const pendingCount = items.filter((item) => !hasCompleteScore(item)).length;

  if (items.length === 0) {
    return { percent: 0, label: "No assignments yet", pendingCount: 0 };
  }

  const percent = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  return {
    percent,
    label: `${percent}% of weighted work graded`,
    pendingCount,
  };
}

export function getNextDeadlineLabel(items: BaseCourseItem[]): string {
  const pending = items.filter((item) => !hasCompleteScore(item));
  if (pending.length === 0) {
    return items.length === 0 ? "Add assignments to track progress" : "All assignments graded";
  }
  return `Next up: ${pending[0].item_name}`;
}

/** Prefer a course with pending scores; otherwise the first course. */
export function pickDefaultCourseId(courses: RegisteredCourse[]): number | null {
  if (courses.length === 0) return null;
  const withPending = courses.find((course) => course.items.some((item) => !hasCompleteScore(item)));
  return (withPending ?? courses[0]).id;
}

/** Meta-only rows for the summary rail (not grade/GPA — those live in the workspace). */
export function getCourseSummaryRows(
  course: RegisteredCourse,
  schedule: ScheduleResponse | null,
) {
  const professor = getProfessorForCourse(schedule, course.course.course_code);
  const pendingCount = course.items.filter((item) => !hasCompleteScore(item)).length;

  return [
    { label: "Term", value: course.course.term || "—" },
    { label: "Department", value: course.course.department || "—" },
    { label: "Professor", value: professor || "Not in schedule" },
    { label: "Credits", value: course.course.credits ? String(course.course.credits) : "—" },
    {
      label: "Assignments",
      value: pendingCount > 0 ? `${course.items.length} (${pendingCount} pending)` : String(course.items.length),
    },
    { label: "Next up", value: getNextDeadlineLabel(course.items) },
  ];
}
