import assert from "node:assert/strict"
import test, { describe, it } from "node:test"
import type { Event } from "./types"
import {
  eventActions,
  eventGoogleCalendarUrl,
  eventPolicyLabel,
  formatEventDateRange,
  getEventTiming,
} from "./functions"

describe("event Google Calendar link", () => {
  it("uses UTC instants and preserves the event details", () => {
    const url = new URL(
      eventGoogleCalendarUrl({
        name: "Open day & Q&A",
        start_datetime: "2026-08-10T15:30:00+05:00",
        end_datetime: "2026-08-10T17:00:00+05:00",
        place: "Block C, room 101",
        description: "Bring your student ID",
      })
    )

    assert.equal(url.origin, "https://calendar.google.com")
    assert.equal(url.searchParams.get("text"), "Open day & Q&A")
    assert.equal(
      url.searchParams.get("dates"),
      "20260810T103000Z/20260810T120000Z"
    )
    assert.equal(url.searchParams.get("location"), "Block C, room 101")
    assert.equal(url.searchParams.get("details"), "Bring your student ID")
  })
})

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

test("formats a campus date interval without inventing a daily schedule", () => {
  assert.equal(
    formatEventDateRange(
      "2026-09-23T10:00:00+05:00",
      "2026-09-23T22:00:00+05:00"
    ),
    "23 Sept 2026"
  )
  assert.equal(
    formatEventDateRange(
      "2026-09-22T10:00:00+05:00",
      "2026-09-23T22:00:00+05:00"
    ),
    "22–23 Sept 2026"
  )
  assert.equal(
    formatEventDateRange(
      "2026-09-30T10:00:00+05:00",
      "2026-10-02T22:00:00+05:00"
    ),
    "30 Sept – 2 Oct 2026"
  )
  assert.equal(
    formatEventDateRange(
      "2026-12-31T10:00:00+05:00",
      "2027-01-02T22:00:00+05:00"
    ),
    "31 Dec 2026 – 2 Jan 2027"
  )
})

describe("what an event's dialog offers", () => {
  const upcoming = getEventTiming(
    "2026-07-29T15:00:00.000Z",
    "2026-07-29T17:00:00.000Z",
    NOW
  )
  const finished = getEventTiming(
    "2026-07-27T08:00:00.000Z",
    "2026-07-27T10:00:00.000Z",
    NOW
  )
  const event = (overrides: Partial<Event>): Event =>
    ({
      id: 1,
      policy: "open",
      status: "approved",
      type: "social",
      registration_link: null,
      ...overrides,
    }) as Event

  it("offers attending and the calendar on an approved open event", () => {
    assert.deepEqual(eventActions(event({}), upcoming), {
      attend: true,
      registerAt: null,
      calendar: true,
    })
  })

  it("offers the organiser's registration link instead of attending", () => {
    assert.deepEqual(
      eventActions(
        event({ policy: "registration", registration_link: "https://x.test/r" }),
        upcoming
      ),
      { attend: false, registerAt: "https://x.test/r", calendar: true }
    )
  })

  it("offers nothing once the event is over", () => {
    assert.deepEqual(eventActions(event({}), finished), {
      attend: false,
      registerAt: null,
      calendar: false,
    })
  })

  it("does not take attendance on an event that is not approved", () => {
    for (const status of ["pending", "rejected", "cancelled"] as const) {
      assert.equal(eventActions(event({ status }), upcoming).attend, false)
    }
  })

  it("treats a recruitment as a deadline, not something to attend or diarise", () => {
    assert.deepEqual(eventActions(event({ type: "recruitment" }), upcoming), {
      attend: false,
      registerAt: null,
      calendar: false,
    })
  })
})
