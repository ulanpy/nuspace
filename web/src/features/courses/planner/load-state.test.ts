import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { resolvePlannerLoadState } from "./load-state.ts"

const semesters = [
  { value: "826", label: "Spring 2027" },
  { value: "825", label: "Fall 2026" },
]
const plans = {
  items: [
    { id: 4, name: "Main", course_count: 2 },
    { id: 7, name: "Alternative", course_count: 0 },
  ],
  count: 2,
  max_allowed: 5,
}

describe("planner load state", () => {
  it("waits for both prerequisite queries", () => {
    assert.deepEqual(
      resolvePlannerLoadState({
        semesters: { status: "pending" },
        plans: { status: "success", data: plans },
      }),
      { status: "pending" }
    )
  })

  it("surfaces each query error with its retry source", () => {
    const semesterError = new Error("terms failed")
    const planError = new Error("plans failed")

    assert.deepEqual(
      resolvePlannerLoadState({
        semesters: { status: "error", error: semesterError },
        plans: { status: "success", data: plans },
      }),
      { status: "error", source: "semesters", error: semesterError }
    )
    assert.deepEqual(
      resolvePlannerLoadState({
        semesters: { status: "success", data: semesters },
        plans: { status: "error", error: planError },
      }),
      { status: "error", source: "plans", error: planError }
    )
  })

  it("distinguishes genuine empty terms from a broken empty plan list", () => {
    assert.deepEqual(
      resolvePlannerLoadState({
        semesters: { status: "success", data: [] },
        plans: { status: "success", data: plans },
      }),
      { status: "no-terms" }
    )
    assert.deepEqual(
      resolvePlannerLoadState({
        semesters: { status: "success", data: semesters },
        plans: {
          status: "success",
          data: { items: [], count: 0, max_allowed: 5 },
        },
      }),
      { status: "no-plans" }
    )
  })

  it("uses requested values when valid and safe fallbacks when stale", () => {
    const selected = resolvePlannerLoadState({
      semesters: { status: "success", data: semesters },
      plans: { status: "success", data: plans },
      requestedTerm: "825",
      requestedPlan: 7,
    })
    assert.equal(selected.status, "ready")
    if (selected.status === "ready") {
      assert.equal(selected.activeTerm, "825")
      assert.equal(selected.activeLabel, "Fall 2026")
      assert.equal(selected.activePlanId, 7)
    }

    const fallback = resolvePlannerLoadState({
      semesters: { status: "success", data: semesters },
      plans: { status: "success", data: plans },
      requestedTerm: "expired",
      requestedPlan: 999,
    })
    assert.equal(fallback.status, "ready")
    if (fallback.status === "ready") {
      assert.equal(fallback.activeTerm, "826")
      assert.equal(fallback.activePlanId, 4)
    }
  })
})
