import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { templateItemsFromCourse } from "./templates.ts"

describe("shared course templates", () => {
  it("contains assignment structure but never personal scores", () => {
    const course = {
      items: [
        {
          item_name: "Midterm",
          total_weight_pct: 30,
          obtained_score: 18,
          max_score: 20,
        },
      ],
    }
    const result = templateItemsFromCourse(course)

    assert.deepEqual(result, [{ item_name: "Midterm", total_weight_pct: 30 }])
    assert.equal("obtained_score" in (result[0] ?? {}), false)
    assert.equal("max_score" in (result[0] ?? {}), false)
  })
})
