import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { selectionSnapshot } from "./schedule.ts"

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
