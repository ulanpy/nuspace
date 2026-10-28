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

/** The top of NU's scale, which the GPA bar is drawn against. */
const GPA_CEILING = 4

/** A `Weighted` course the dashboard can exclude: it needs an id to match on. */
interface Excludable extends Weighted {
  id: number
}

export interface GpaSummary {
  /** Where the semester stands if nothing else were submitted. */
  current: number
  /** Where it lands if current performance holds. */
  projected: number
  /** The best still reachable. */
  ceiling: number
  /** Courses actually left out, so a stale id does not inflate the count. */
  excludedCount: number
}

/**
 * The dashboard's GPA summary with some courses left out.
 *
 * Exclusion is a what-if: the caller holds the ids for the session and nothing
 * here is stored. With every course excluded the figures are 0, as for an
 * empty term, never NaN.
 */
export function summarizeGpa(
  courses: readonly Excludable[],
  excludedIds: ReadonlySet<number>
): GpaSummary {
  const counted = courses.filter((course) => !excludedIds.has(course.id))
  return {
    current: semesterGpa(counted),
    projected: projectedGpa(counted),
    ceiling: ceilingGpa(counted),
    excludedCount: courses.length - counted.length,
  }
}

/** The ids with `id` flipped in or out, as a new set. */
export function toggleExcluded(
  excludedIds: ReadonlySet<number>,
  id: number
): Set<number> {
  const next = new Set(excludedIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** How far along the 0 to 4.0 bar a GPA sits, as a percentage. */
export function gpaBarFill(gpa: number): number {
  if (!Number.isFinite(gpa)) return 0
  return (Math.min(GPA_CEILING, Math.max(0, gpa)) / GPA_CEILING) * 100
}

/** Items still waiting on a usable score. */
export function pendingCount(items: readonly ScoredItem[]): number {
  return items.filter((item) => !isGraded(item)).length
}

/** What to do next in a course: the first ungraded item, or why there is none. */
export function nextUp(
  items: readonly (ScoredItem & { item_name: string })[]
): string {
  const first = items.find((item) => !isGraded(item))
  if (first) return first.item_name
  return items.length === 0
    ? "Add assignments to track progress"
    : "All assignments graded"
}

/** The two-letter mark on a course's tinted chip: `CSCI 151` → `CS`. */
export function courseCodeChip(courseCode: string): string {
  return courseCode.slice(0, 2).toUpperCase()
}

/**
 * Tailwind classes are written out whole so the compiler can see them; a
 * template string like `border-l-chart-${n}` would never reach the stylesheet.
 */
const DEPARTMENT_ACCENTS = [
  {
    words: ["computing", "data science", "software", "informatics"],
    border: "border-l-chart-3",
    chip: "bg-chart-3/15 text-chart-3",
  },
  {
    words: ["mathematics", "math"],
    border: "border-l-chart-2",
    chip: "bg-chart-2/15 text-chart-2",
  },
  {
    words: ["physics", "engineering", "digital"],
    border: "border-l-chart-5",
    chip: "bg-chart-5/15 text-chart-5",
  },
  {
    words: ["economics", "management", "business"],
    border: "border-l-chart-1",
    chip: "bg-chart-1/15 text-chart-1",
  },
  {
    words: ["chemistry", "science and technology"],
    border: "border-l-chart-4",
    chip: "bg-chart-4/15 text-chart-4",
  },
] as const

export interface DepartmentAccent {
  /** The coloured left edge of a course row. */
  border: string
  /** The tinted code chip. */
  chip: string
}

/**
 * A department's colour pair. Named departments get theirs; any other school
 * is hashed onto the palette, so it is still stable between renders and
 * between visits, which is what lets a student learn "orange is Humanities".
 */
export function departmentAccent(school: string): DepartmentAccent {
  const normalized = school.toLowerCase()
  const named = DEPARTMENT_ACCENTS.find((accent) =>
    accent.words.some((word) => normalized.includes(word))
  )
  if (named) return named

  let hash = 0
  for (const character of normalized) hash += character.charCodeAt(0)
  return DEPARTMENT_ACCENTS[hash % DEPARTMENT_ACCENTS.length]
}

export type BreakdownKind = "earned" | "lost" | "pending" | "unassigned"

export interface GradeBreakdown {
  segments: { kind: BreakdownKind; value: number }[]
  /** What a full bar stands for: 100, or more when weights overshoot it. */
  scale: number
}

/**
 * Where a course's weight stands: marks earned, marks lost on graded work,
 * weight still waiting on a score, and weight no assignment has claimed yet.
 * Slivers under 0.05 are dropped so rounding noise never draws a segment.
 */
export function gradeBreakdown(items: readonly ScoredItem[]): GradeBreakdown {
  const weight = (item: ScoredItem) => item.total_weight_pct ?? 0
  const totalWeight = items.reduce((sum, item) => sum + weight(item), 0)
  const gradedWeight = items
    .filter(isGraded)
    .reduce((sum, item) => sum + weight(item), 0)
  const earned = courseScore(items)

  const segments: GradeBreakdown["segments"] = [
    { kind: "earned" as const, value: earned },
    { kind: "lost" as const, value: Math.max(0, gradedWeight - earned) },
    { kind: "pending" as const, value: totalWeight - gradedWeight },
    { kind: "unassigned" as const, value: Math.max(0, 100 - totalWeight) },
  ].filter((segment) => segment.value > 0.05)

  return { segments, scale: Math.max(100, totalWeight) }
}
