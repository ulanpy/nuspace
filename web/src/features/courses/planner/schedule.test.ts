import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  formatScheduleShortlist,
  gridHours,
  parseCollapseEmptyEdges,
  selectionSnapshot,
  visibleDays,
} from "./schedule.ts"

describe("planner selection snapshot", () => {
  it("captures selected section ids for every course, including empty ones", () => {
    const planner = {
      courses: [
        {
          id: 10,
          sections: [
            { id: 101, is_selected: true },
            { id: 102, is_selected: false },
            { id: 103, is_selected: true },
          ],
        },
        { id: 20, sections: [] },
      ],
    }

    assert.deepEqual(selectionSnapshot(planner), [
      { courseId: 10, sectionIds: [101, 103] },
      { courseId: 20, sectionIds: [] },
    ])
  })
})

describe("planner cropped schedule", () => {
  const course = {
    id: 1,
    catalog_id: "1",
    course_code: "CSCI 151",
    title: "Programming",
    level: null,
    school: null,
    term_value: null,
    term_label: null,
    capacity_total: null,
    sections: [],
  }
  const events = [
    {
      course,
      section: {
        id: 11,
        section_code: "L1",
        days: "WR",
        times: "10:00 AM - 11:20 AM",
        room: null,
        faculty: null,
        capacity: null,
        enrollment_snapshot: null,
        selected_count: 0,
        is_selected: true,
      },
    },
  ]

  it("trims empty time and weekday edges when requested", () => {
    assert.deepEqual(gridHours(events, true), {
      startHour: 10,
      endHourExclusive: 12,
    })
    assert.deepEqual(
      visibleDays(events, true).map((day) => day.key),
      ["W", "R"]
    )
  })

  it("keeps the campus-day frame when cropping is disabled", () => {
    assert.deepEqual(gridHours(events), {
      startHour: 8,
      endHourExclusive: 23,
    })
    assert.deepEqual(
      visibleDays(events).map((day) => day.key),
      ["M", "T", "W", "R", "F"]
    )
  })

  it("parses only the persisted enabled value", () => {
    assert.equal(parseCollapseEmptyEdges("1"), true)
    assert.equal(parseCollapseEmptyEdges("0"), false)
    assert.equal(parseCollapseEmptyEdges(null), false)
  })
})

describe("planner shortlist", () => {
  it("formats selected sections and skips courses without a selection", () => {
    assert.equal(
      formatScheduleShortlist({
        courses: [
          {
            course_code: "CSCI 151",
            sections: [
              { section_code: "L1", is_selected: true },
              { section_code: "LB2", is_selected: true },
            ],
          },
          {
            course_code: "MATH-161",
            sections: [{ section_code: "L3", is_selected: false }],
          },
        ],
      }),
      "CSCI_151 L1 | LB2"
    )
  })
})
