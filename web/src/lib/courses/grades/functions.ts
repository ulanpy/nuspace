import type { GradeReport } from "@/lib/courses"

/**
 * The outcomes a grade report breaks down into, in the order they stack.
 *
 * A/B/C/D/F are the graded outcomes; P (pass), I (incomplete), AU (audit) and
 * W/AW (withdrawn) are not grades at all but do account for enrolled students,
 * so leaving them out would make the bar not add up.
 */
export const GRADE_BANDS = [
  { key: "pct_A", label: "A" },
  { key: "pct_B", label: "B" },
  { key: "pct_C", label: "C" },
  { key: "pct_D", label: "D" },
  { key: "pct_F", label: "F" },
  { key: "pct_P", label: "P" },
  { key: "pct_I", label: "I" },
  { key: "pct_AU", label: "AU" },
  { key: "pct_W_AW", label: "W" },
] as const satisfies readonly { key: keyof GradeReport; label: string }[]

export type GradeBandKey = (typeof GRADE_BANDS)[number]["key"]

export interface GradeBand {
  key: GradeBandKey
  label: string
  /** Share of the section, in percent. Always above zero. */
  pct: number
  /** Students, derived from the share; null when the report has no head count. */
  students: number | null
}

/**
 * The bands a report actually has, skipping empty and missing ones.
 *
 * `students` is derived (`pct` of `grades_count`, rounded) because the API
 * only reports shares; it is an estimate to the nearest student.
 */
export function gradeBands(
  report: Pick<GradeReport, GradeBandKey | "grades_count">
): GradeBand[] {
  return GRADE_BANDS.flatMap(({ key, label }) => {
    const pct = report[key]
    if (typeof pct !== "number" || !(pct > 0)) return []
    return [
      {
        key,
        label,
        pct,
        students:
          report.grades_count === null
            ? null
            : Math.round((pct / 100) * report.grades_count),
      },
    ]
  })
}

/**
 * The search string a grade-statistics link carries.
 *
 * The bot links to `/stats?keyword=MATH%20161`, and a person can type
 * anything into the box, so surrounding and repeated whitespace is dropped
 * and a blank keyword means "no keyword" rather than an empty search.
 */
export function normalizeKeyword(raw: string | undefined): string | undefined {
  const keyword = raw?.trim().replace(/\s+/g, " ")
  return keyword ? keyword : undefined
}
