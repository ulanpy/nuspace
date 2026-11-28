import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  courseCodeChip,
  departmentAccent,
  gpaBarFill,
  gradeBreakdown,
  nextUp,
  pendingCount,
  summarizeGpa,
  toggleExcluded,
} from "./functions"
import type { ScoredItem } from "./functions"

function graded(weight: number, obtained: number, max = 100): ScoredItem {
  return { total_weight_pct: weight, obtained_score: obtained, max_score: max }
}

function pending(weight: number): ScoredItem {
  return { total_weight_pct: weight, obtained_score: null, max_score: null }
}

function course(
  id: number,
  credits: number | null,
  items: ScoredItem[]
): { id: number; course: { credits: number | null }; items: ScoredItem[] } {
  return { id, course: { credits }, items }
}

describe("summarizeGpa", () => {
  // 100% of 40 banked: score 40 -> 0.00; of graded work only: 100 -> 4.00.
  const strong = course(1, 6, [graded(40, 40, 40), pending(60)])
  // 80 of 100 banked: 3.00 both ways.
  const steady = course(2, 6, [graded(100, 80)])

  it("credit-weights every course when nothing is excluded", () => {
    const summary = summarizeGpa([strong, steady], new Set())
    assert.equal(summary.current, (0 + 3) / 2)
    assert.equal(summary.projected, (4 + 3) / 2)
    assert.equal(summary.ceiling, (4 + 3) / 2)
    assert.equal(summary.excludedCount, 0)
  })

  it("leaves an excluded course out of all three figures", () => {
    const summary = summarizeGpa([strong, steady], new Set([1]))
    assert.equal(summary.current, 3)
    assert.equal(summary.projected, 3)
    assert.equal(summary.ceiling, 3)
    assert.equal(summary.excludedCount, 1)
  })

  it("counts only exclusions that match a course on screen", () => {
    const summary = summarizeGpa([strong, steady], new Set([2, 99]))
    assert.equal(summary.excludedCount, 1)
  })

  it("is zero, not NaN, when everything is excluded", () => {
    const summary = summarizeGpa([strong], new Set([1]))
    assert.equal(summary.current, 0)
    assert.equal(summary.projected, 0)
    assert.equal(summary.ceiling, 0)
    assert.equal(summary.excludedCount, 1)
  })
})

describe("toggleExcluded", () => {
  it("adds a missing id and removes a present one", () => {
    const once = toggleExcluded(new Set<number>(), 5)
    assert.deepEqual([...once], [5])
    assert.deepEqual([...toggleExcluded(once, 5)], [])
  })

  it("returns a new set and never mutates its input", () => {
    const before = new Set([1])
    const after = toggleExcluded(before, 2)
    assert.notEqual(after, before)
    assert.deepEqual([...before], [1])
    assert.deepEqual(
      [...after].sort((a, b) => a - b),
      [1, 2]
    )
  })
})

describe("gpaBarFill", () => {
  it("scales a GPA onto the 0-4 bar as a percentage", () => {
    assert.equal(gpaBarFill(0), 0)
    assert.equal(gpaBarFill(2), 50)
    assert.equal(gpaBarFill(4), 100)
  })

  it("clamps out-of-range and non-finite values", () => {
    assert.equal(gpaBarFill(-1), 0)
    assert.equal(gpaBarFill(4.5), 100)
    assert.equal(gpaBarFill(Number.NaN), 0)
  })
})

describe("departmentAccent", () => {
  it("gives the same school the same colours every time", () => {
    assert.deepEqual(
      departmentAccent("School of Humanities"),
      departmentAccent("School of Humanities")
    )
  })

  it("matches named departments case-insensitively", () => {
    const computing = departmentAccent("School of Computing and Data Science")
    assert.deepEqual(departmentAccent("SCHOOL OF COMPUTING"), computing)
    assert.notDeepEqual(departmentAccent("School of Mathematics"), computing)
    assert.notDeepEqual(
      departmentAccent("School of Economics and Management"),
      computing
    )
  })

  it("pairs an edge class with a tinted chip class", () => {
    const accent = departmentAccent("School of Mathematics")
    assert.match(accent.border, /^border-l-chart-\d$/)
    assert.match(accent.chip, /^bg-chart-\d\/15 text-chart-\d$/)
  })

  it("still returns a colour for an unknown or empty school", () => {
    assert.match(
      departmentAccent("Graduate School of Public Policy").chip,
      /chart/
    )
    assert.match(departmentAccent("").chip, /chart/)
  })
})

describe("courseCodeChip", () => {
  it("uses the first two letters of the code", () => {
    assert.equal(courseCodeChip("CSCI 151"), "CS")
    assert.equal(courseCodeChip("math 161"), "MA")
  })

  it("copes with short and empty codes", () => {
    assert.equal(courseCodeChip("A"), "A")
    assert.equal(courseCodeChip(""), "")
  })
})

describe("pendingCount", () => {
  it("counts items with no usable score", () => {
    assert.equal(pendingCount([graded(10, 9, 10), pending(20), pending(5)]), 2)
  })

  it("treats a zero max score as pending, as the GPA arithmetic does", () => {
    assert.equal(pendingCount([graded(10, 0, 0)]), 1)
  })

  it("is zero for no items", () => {
    assert.equal(pendingCount([]), 0)
  })
})

describe("nextUp", () => {
  const named = (name: string, item: ScoredItem) => ({
    ...item,
    item_name: name,
  })

  it("names the first ungraded item", () => {
    assert.equal(
      nextUp([
        named("Quiz 1", graded(10, 9, 10)),
        named("Midterm", pending(30)),
        named("Final", pending(40)),
      ]),
      "Midterm"
    )
  })

  it("says so when everything is graded", () => {
    assert.equal(
      nextUp([named("Quiz 1", graded(10, 9, 10))]),
      "All assignments graded"
    )
  })

  it("invites the first assignment when there are none", () => {
    assert.equal(nextUp([]), "Add assignments to track progress")
  })
})

describe("gradeBreakdown", () => {
  it("splits the weight into earned, lost, pending and unassigned", () => {
    // Quiz: 8/10 of 20% -> earned 16, lost 4. Exam: pending 30%. 50% unassigned.
    const breakdown = gradeBreakdown([graded(20, 8, 10), pending(30)])
    assert.deepEqual(breakdown.segments, [
      { kind: "earned", value: 16 },
      { kind: "lost", value: 4 },
      { kind: "pending", value: 30 },
      { kind: "unassigned", value: 50 },
    ])
    assert.equal(breakdown.scale, 100)
  })

  it("drops empty segments", () => {
    const breakdown = gradeBreakdown([graded(100, 100)])
    assert.deepEqual(breakdown.segments, [{ kind: "earned", value: 100 }])
  })

  it("scales to the total when weights add up past 100", () => {
    const breakdown = gradeBreakdown([graded(80, 80), pending(40)])
    assert.equal(breakdown.scale, 120)
    assert.equal(
      breakdown.segments.some((segment) => segment.kind === "unassigned"),
      false
    )
  })

  it("is empty for a course with no assignments", () => {
    const breakdown = gradeBreakdown([])
    assert.deepEqual(breakdown.segments, [{ kind: "unassigned", value: 100 }])
  })
})
