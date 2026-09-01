import assert from "node:assert/strict"
import test from "node:test"

import { getDeadlinePresentation } from "./presentation.ts"

const NOW = Date.parse("2026-07-27T12:00:00.000Z")

test("treats a missing or invalid deadline as year-round", () => {
  assert.deepEqual(getDeadlinePresentation(null, NOW), {
    kind: "year-round",
    label: "Year-round",
    relative: null,
  })
  assert.equal(getDeadlinePresentation("not-a-date", NOW).kind, "year-round")
})

test("marks deadlines within seven days as closing soon", () => {
  assert.deepEqual(getDeadlinePresentation("2026-07-30T12:00:00.000Z", NOW), {
    kind: "closing-soon",
    label: "Closing soon",
    relative: "Closes in 3 days",
  })
})

test("distinguishes open and closed deadlines", () => {
  assert.equal(
    getDeadlinePresentation("2026-08-27T12:00:00.000Z", NOW).kind,
    "open"
  )
  assert.deepEqual(getDeadlinePresentation("2026-07-26T12:00:00.000Z", NOW), {
    kind: "closed",
    label: "Closed",
    relative: "Closed 1 day ago",
  })
})

test("keeps a date-only deadline open through the campus calendar day", () => {
  assert.deepEqual(getDeadlinePresentation("2026-07-27", NOW), {
    kind: "closing-soon",
    label: "Closing soon",
    relative: "Closes today",
  })
  assert.equal(getDeadlinePresentation("2026-07-26", NOW).kind, "closed")
})
