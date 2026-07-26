import type { GradeReport } from "./types"
import { formatGpa, formatWeight } from "./gpa.ts"

export const MAX_GRADE_COMPARISONS = 8

export interface ComparisonMetric {
  label: string
  values: string[]
}

export function toggleGradeComparison<T extends { id: number }>(
  selected: readonly T[],
  report: T
): T[] {
  if (selected.some((item) => item.id === report.id)) {
    return selected.filter((item) => item.id !== report.id)
  }
  if (selected.length >= MAX_GRADE_COMPARISONS) return [...selected]
  return [...selected, report]
}

type ComparableGradeReport = Pick<
  GradeReport,
  | "course_code"
  | "section"
  | "term"
  | "faculty"
  | "avg_gpa"
  | "median_gpa"
  | "std_dev"
  | "pct_W_AW"
  | "grades_count"
>

export function comparisonMetrics(
  selected: readonly ComparableGradeReport[]
): ComparisonMetric[] {
  return [
    { label: "Course", values: selected.map((item) => item.course_code) },
    { label: "Section", values: selected.map((item) => item.section ?? "—") },
    { label: "Term", values: selected.map((item) => item.term ?? "—") },
    { label: "Faculty", values: selected.map((item) => item.faculty ?? "—") },
    {
      label: "Average GPA",
      values: selected.map((item) => formatGpa(item.avg_gpa)),
    },
    {
      label: "Median GPA",
      values: selected.map((item) => formatGpa(item.median_gpa)),
    },
    {
      label: "Spread",
      values: selected.map((item) =>
        item.std_dev === null ? "—" : `±${formatGpa(item.std_dev)}`
      ),
    },
    {
      label: "Withdrawals",
      values: selected.map((item) => formatWeight(item.pct_W_AW)),
    },
    {
      label: "Students",
      values: selected.map((item) =>
        item.grades_count === null ? "—" : String(item.grades_count)
      ),
    },
  ]
}
