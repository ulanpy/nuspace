import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { eventGoogleCalendarUrl } from "./calendar.ts"

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
