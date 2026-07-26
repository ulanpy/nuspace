import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  MAX_GRADE_COMPARISONS,
  comparisonMetrics,
  toggleGradeComparison,
} from "./grade-comparison.ts"

function report(id: number) {
  return {
    id,
    course_code: `CS ${id}`,
    section: null,
    term: null,
    faculty: null,
    avg_gpa: null,
    median_gpa: null,
    std_dev: null,
    pct_W_AW: null,
    grades_count: null,
  }
}

describe("grade comparison", () => {
  it("toggles reports and enforces the eight-report limit", () => {
    const selected = Array.from({ length: MAX_GRADE_COMPARISONS }, (_, index) =>
      report(index + 1)
    )

    assert.deepEqual(
      toggleGradeComparison(selected, report(99)).map((item) => item.id),
      selected.map((item) => item.id)
    )
    const first = selected[0]
    assert.ok(first)
    assert.equal(toggleGradeComparison(selected, first).length, 7)
  })

  it("formats missing percentages without appending a percent sign", () => {
    const withdrawals = comparisonMetrics([report(1)]).find(
      (metric) => metric.label === "Withdrawals"
    )
    assert.deepEqual(withdrawals?.values, ["—"])
  })
})
