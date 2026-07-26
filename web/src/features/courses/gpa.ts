/**
 * GPA arithmetic for the live calculator.
 *
 * Ported deliberately unchanged from the previous app's grade-utils. Students
 * make real decisions on these numbers — whether to drop a course, what they
 * need on a final — so the scale and the rounding behaviour are treated as a
 * contract, not an implementation detail. The old code spread these across a
 * 332-line utils file and a 761-line view model; the arithmetic is the same,
 * only the naming and the grouping changed.
 */

/** Enough of a course item to grade. Keeps callers free of the full API type. */
export interface ScoredItem {
  total_weight_pct: number | null
  obtained_score: number | null
  max_score: number | null
}

type CompleteItem = ScoredItem & { obtained_score: number; max_score: number }

/**
 * An item counts only once it has both a score and something to score out of.
 * A `max_score` of 0 is excluded rather than treated as full marks — it would
 * divide by zero.
 */
export function isGraded(item: ScoredItem): item is CompleteItem {
  return (
    item.obtained_score !== null &&
    item.max_score !== null &&
    item.max_score > 0
  )
}

function gradedOnly(items: readonly ScoredItem[]): CompleteItem[] {
  return items.filter(isGraded)
}

/** NU's letter scale, as points. Thresholds are inclusive lower bounds. */
const GPA_SCALE: readonly [score: number, points: number, letter: string][] = [
  [95, 4.0, "A"],
  [90, 3.67, "A-"],
  [85, 3.33, "B+"],
  [80, 3.0, "B"],
  [75, 2.67, "B-"],
  [70, 2.33, "C+"],
  [65, 2.0, "C"],
  [60, 1.67, "C-"],
  [55, 1.33, "D+"],
  [50, 1.0, "D"],
]

export function scoreToGpa(score: number): number {
  return GPA_SCALE.find(([threshold]) => score >= threshold)?.[1] ?? 0
}

export function scoreToLetter(score: number): string {
  return GPA_SCALE.find(([threshold]) => score >= threshold)?.[2] ?? "F"
}

/**
 * Points banked out of 100 so far — ungraded work counts as zero.
 *
 * This is the pessimistic reading: in week three with one 10% quiz returned, a
 * perfect score reads as 10. It is what the semester total would be if the rest
 * of the term were never handed in.
 */
export function courseScore(items: readonly ScoredItem[]): number {
  return gradedOnly(items).reduce(
    (total, item) =>
      total +
      (item.obtained_score / item.max_score) * (item.total_weight_pct ?? 0),
    0
  )
}

/**
 * Performance on graded work only, rescaled to 100.
 *
 * The optimistic reading, and the one that answers "how am I doing": that same
 * perfect 10% quiz reads as 100. Undefined until something has been graded, so
 * it returns 0 for an empty course.
 */
export function courseScoreSoFar(items: readonly ScoredItem[]): number {
  const graded = gradedOnly(items)
  const weightGraded = graded.reduce(
    (total, item) => total + (item.total_weight_pct ?? 0),
    0
  )
  if (weightGraded === 0) return 0

  return (courseScore(graded) / weightGraded) * 100
}

/** The ceiling: current points plus full marks on everything still outstanding. */
export function courseScoreCeiling(items: readonly ScoredItem[]): number {
  const graded = gradedOnly(items)
  if (graded.length === 0) return 0

  const weightGraded = graded.reduce(
    (total, item) => total + (item.total_weight_pct ?? 0),
    0
  )
  return Math.min(100, courseScore(graded) + Math.max(0, 100 - weightGraded))
}

/** Something with credits and gradeable items — a registered course, loosely. */
interface Weighted {
  course: { credits: number | null }
  items: readonly ScoredItem[]
}

/**
 * Credit-weighted mean of per-course GPAs.
 *
 * Courses with nothing graded are skipped entirely rather than counted as zero,
 * which would drag the average down for a course that simply hasn't started
 * returning work. Courses carrying no credits are skipped too — they cannot be
 * weighted, and including them at weight zero changes nothing.
 */
function weightedGpa(
  courses: readonly Weighted[],
  toScore: (items: readonly ScoredItem[]) => number
): number {
  let points = 0
  let credits = 0

  for (const registered of courses) {
    if (gradedOnly(registered.items).length === 0) continue

    const courseCredits = registered.course.credits ?? 0
    if (courseCredits <= 0) continue

    points += scoreToGpa(toScore(registered.items)) * courseCredits
    credits += courseCredits
  }

  return credits > 0 ? points / credits : 0
}

/** Where the semester stands if nothing else were submitted. */
export function semesterGpa(courses: readonly Weighted[]): number {
  return weightedGpa(courses, courseScore)
}

/** Where the semester lands if current performance holds. */
export function projectedGpa(courses: readonly Weighted[]): number {
  return weightedGpa(courses, courseScoreSoFar)
}

/** The best still reachable, acing everything outstanding. */
export function ceilingGpa(courses: readonly Weighted[]): number {
  return weightedGpa(courses, courseScoreCeiling)
}

export function formatGpa(gpa: number | null | undefined): string {
  return gpa == null ? "—" : gpa.toFixed(2)
}

/** A bare number, trimmed of trailing zeros: `47.50` → `47.5`. */
export function formatPoints(value: number | null | undefined): string {
  if (value == null) return "—"
  return value.toFixed(2).replace(/\.?0+$/, "")
}

/**
 * Weights and earned percentages.
 *
 * Only for values that really are percentages. Raw scores are points out of
 * whatever the assignment is marked on — "47.5 / 50" is right where
 * "47.5% / 50%" is nonsense — so those use `formatPoints`.
 */
export function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—"
  return `${formatPoints(value)}%`
}
