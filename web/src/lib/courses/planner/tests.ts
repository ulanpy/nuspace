import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  resolvePlannerLoadState,
  normalizeCourseCode,
  parseSyllabusLinks,
  syllabusLink,
} from "./functions"

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

describe("syllabus links", () => {
  it("normalizes codes and expands slash-separated aliases", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        "CS 101/CSCI 101,Intro,https://example.test/syllabus",
      ].join("\n")
    )

    assert.equal(normalizeCourseCode("  cs   101 "), "CS 101")
    assert.equal(
      syllabusLink(links, "csci 101"),
      "https://example.test/syllabus"
    )
  })

  it("keeps the first published link for a duplicate code", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        "CS 101,Intro,https://example.test/first",
        "CS 101,Intro,https://example.test/second",
      ].join("\n")
    )
    assert.equal(links["CS 101"], "https://example.test/first")
  })

  it("reads the final URL column when a quoted course title has commas", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        'HST 242,"History: Politics, Society, Culture",https://example.test/hst',
      ].join("\n")
    )
    assert.equal(links["HST 242"], "https://example.test/hst")
  })
})
