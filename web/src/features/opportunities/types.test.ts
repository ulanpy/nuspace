import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatEligibilities } from "./types.ts"

describe("opportunity eligibility labels", () => {
  it("groups, sorts and deduplicates years by education level", () => {
    assert.deepEqual(
      formatEligibilities([
        { id: 1, education_level: "UG", year: 3 },
        { id: 2, education_level: "UG", year: 1 },
        { id: 3, education_level: "UG", year: 3 },
        { id: 4, education_level: "PhD", year: null },
      ]),
      ["Undergraduate · Year 1, 3", "PhD"]
    )
  })
})
