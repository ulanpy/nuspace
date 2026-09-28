import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { pageRangeSummary } from "./page-range.ts"

describe("pageRangeSummary", () => {
  it("describes a full page", () => {
    const items = Array.from({ length: 10 }, (_, index) => index)

    assert.equal(
      pageRangeSummary({ page: 2, size: 10, total: 84, items }),
      "Showing 11–20 of 84"
    )
  })

  it("describes a short last page", () => {
    assert.equal(
      pageRangeSummary({ page: 5, size: 10, total: 42, items: [0, 1] }),
      "Showing 41–42 of 42"
    )
  })

  it("says nothing rather than claiming an empty range", () => {
    assert.equal(pageRangeSummary(undefined), null)
    assert.equal(pageRangeSummary({ page: 1, size: 10, total: 0, items: [] }), null)
  })
})
