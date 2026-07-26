import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatScheduleTime, scheduleDays } from "./schedule.ts"
import type { ScheduleItem, StudentSchedule } from "./types.ts"

function item(
  courseCode: string,
  startHour: number,
  startMinute = 0
): ScheduleItem {
  return {
    course_code: courseCode,
    label: "Lecture",
    title: courseCode,
    info: "",
    teacher: "Professor",
    cab: "C3",
    time: {
      start: { hh: startHour, mm: startMinute },
      end: { hh: startHour + 1, mm: startMinute },
    },
  }
}

describe("registered schedule", () => {
  it("deduplicates and orders each day without dropping empty days", () => {
    const late = item("CS 202", 14)
    const early = item("MATH 101", 9, 30)
    const schedule = {
      term_label: "Fall 2026",
      term_value: "825",
      last_synced_at: null,
      schedule: {
        data: [[late, early, late], [], [], [], [], []],
        preferences: { classes: [], colors: {} },
      },
    } satisfies StudentSchedule

    const days = scheduleDays(schedule)
    assert.equal(days.length, 6)
    assert.deepEqual(
      days[0]?.items.map((entry) => entry.course_code),
      ["MATH 101", "CS 202"]
    )
    assert.deepEqual(days[1], { label: "Tuesday", items: [] })
  })

  it("formats times with leading zeroes", () => {
    assert.equal(formatScheduleTime(item("CS 101", 9, 5)), "09:05–10:05")
  })
})
