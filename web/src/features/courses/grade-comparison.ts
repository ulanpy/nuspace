import type { GradeReport } from "./types"
import { formatGpa, formatWeight } from "./gpa.ts"

export const MAX_GRADE_COMPARISONS = 8

export interface ComparisonMetric {
  label: string
  values: string[]
  bestIndexes?: number[]
}

export type BestDirection = "highest" | "lowest"

export function bestValueIndexes(
  values: readonly (number | null | undefined)[],
  direction: BestDirection
): number[] {
  const finite = values.flatMap((value, index) =>
    typeof value === "number" && Number.isFinite(value)
      ? [{ value, index }]
      : []
  )
  if (finite.length === 0) return []

  const target =
    direction === "highest"
      ? Math.max(...finite.map((entry) => entry.value))
      : Math.min(...finite.map((entry) => entry.value))

  return finite
    .filter((entry) => entry.value === target)
    .map((entry) => entry.index)
}

export function difficultyLabel(avgGpa: number | null | undefined): string {
  if (avgGpa == null) return "No signal"
  if (avgGpa >= 3.5) return "Lighter"
  if (avgGpa >= 3) return "Moderate"
  if (avgGpa >= 2.5) return "Challenging"
  return "Very challenging"
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
      bestIndexes: bestValueIndexes(
        selected.map((item) => item.avg_gpa),
        "highest"
      ),
    },
    {
      label: "Median GPA",
      values: selected.map((item) => formatGpa(item.median_gpa)),
      bestIndexes: bestValueIndexes(
        selected.map((item) => item.median_gpa),
        "highest"
      ),
    },
    {
      label: "Difficulty",
      values: selected.map((item) => difficultyLabel(item.avg_gpa)),
    },
    {
      label: "Spread",
      values: selected.map((item) =>
        item.std_dev === null ? "—" : `±${formatGpa(item.std_dev)}`
      ),
      bestIndexes: bestValueIndexes(
        selected.map((item) => item.std_dev),
        "lowest"
      ),
    },
    {
      label: "Withdrawals",
      values: selected.map((item) => formatWeight(item.pct_W_AW)),
      bestIndexes: bestValueIndexes(
        selected.map((item) => item.pct_W_AW),
        "lowest"
      ),
    },
    {
      label: "Students",
      values: selected.map((item) =>
        item.grades_count === null ? "—" : String(item.grades_count)
      ),
    },
  ]
}
