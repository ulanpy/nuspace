import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { selectedCourseId } from "./course-selection.ts"

describe("course selection", () => {
  const courses = [{ id: 11 }, { id: 22 }]

  it("keeps a valid requested course", () => {
    assert.equal(selectedCourseId(courses, 22), 22)
  })

  it("falls back to the first course for stale and missing ids", () => {
    assert.equal(selectedCourseId(courses, 99), 11)
    assert.equal(selectedCourseId(courses, undefined), 11)
  })

  it("returns null for an empty workspace", () => {
    assert.equal(selectedCourseId([], 11), null)
  })
})
