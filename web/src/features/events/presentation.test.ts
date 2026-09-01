import assert from "node:assert/strict"
import test from "node:test"

import { eventPolicyLabel, getEventTiming } from "./presentation.ts"

const NOW = Date.parse("2026-07-27T12:00:00.000Z")

test("presents an upcoming event with a compact countdown", () => {
  assert.deepEqual(
    getEventTiming("2026-07-29T15:00:00.000Z", "2026-07-29T17:00:00.000Z", NOW),
    { kind: "upcoming", label: "Starts in", detail: "2d 3h" }
  )
})

test("presents an event as ongoing until its end", () => {
  assert.deepEqual(
    getEventTiming("2026-07-27T11:30:00.000Z", "2026-07-27T13:15:00.000Z", NOW),
    { kind: "ongoing", label: "Happening now", detail: "1h 15m left" }
  )
})

test("presents a finished event relative to its end", () => {
  assert.deepEqual(
    getEventTiming("2026-07-27T08:00:00.000Z", "2026-07-27T10:00:00.000Z", NOW),
    { kind: "finished", label: "Finished", detail: "Ended 2h ago" }
  )
})

test("uses readable registration policy labels", () => {
  assert.equal(eventPolicyLabel("open"), "Open entry")
  assert.equal(eventPolicyLabel("registration"), "Registration required")
})
