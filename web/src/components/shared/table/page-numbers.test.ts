import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { pageNumbers } from "./page-numbers.ts"

describe("pageNumbers", () => {
  it("shows one page on its own", () => {
    assert.deepEqual(pageNumbers(1, 1), [1])
  })

  it("shows no pages when there are none", () => {
    // An empty table must not render a control claiming there is a page 1.
    assert.deepEqual(pageNumbers(1, 0), [])
    assert.deepEqual(pageNumbers(1, -3), [])
  })

  it("shows both pages on a two-page table, with no ellipsis", () => {
    // The gap check is `start > first + 1`, so a window that already reaches
    // the end prints no "…" — a lone ellipsis between two adjacent numbers is
    // the classic off-by-one here.
    assert.deepEqual(pageNumbers(1, 2), [1, 2])
    assert.deepEqual(pageNumbers(2, 2), [1, 2])
  })

  it("drops the ellipsis when the window covers every page", () => {
    // 1 2 3 4 5 is contiguous, so no gap is elided and no "…" belongs there.
    assert.deepEqual(pageNumbers(3, 5), [1, 2, 3, 4, 5])
    assert.deepEqual(pageNumbers(1, 5), [1, 2, "…", 5])
  })

  it("puts an ellipsis on both sides of a middle page", () => {
    assert.deepEqual(pageNumbers(10, 20), [1, "…", 9, 10, 11, "…", 20])
  })

  it("elides only the far side on the first page", () => {
    assert.deepEqual(pageNumbers(1, 20), [1, 2, "…", 20])
  })

  it("elides only the near side on the last page", () => {
    assert.deepEqual(pageNumbers(20, 20), [1, "…", 19, 20])
  })

  it("never repeats the last page", () => {
    // The regression this guards: the window ends *at* `last`, and the naive
    // `for` loop prints it once as a neighbour and once as the tail.
    assert.deepEqual(pageNumbers(20, 20).filter((p) => p === 20).length, 1)
    assert.deepEqual(pageNumbers(2, 2).filter((p) => p === 2).length, 1)
  })

  it("clamps a current page past the end", () => {
    // A filter narrowing the list leaves `?page=99` in the URL. Rendering the
    // window as asked would put numbers past the end and a second ellipsis
    // after the tail.
    assert.deepEqual(pageNumbers(99, 5), [1, "…", 4, 5])
  })

  it("clamps a current page below the start", () => {
    assert.deepEqual(pageNumbers(0, 5), [1, 2, "…", 5])
    assert.deepEqual(pageNumbers(-4, 5), [1, 2, "…", 5])
  })

  it("honours a wider window", () => {
    assert.deepEqual(pageNumbers(10, 20, 2), [
      1,
      "…",
      8,
      9,
      10,
      11,
      12,
      "…",
      20,
    ])
    // A window of 0 leaves the current page alone between the ellipses.
    assert.deepEqual(pageNumbers(10, 20, 0), [1, "…", 10, "…", 20])
  })

  it("always keeps the first and last page", () => {
    for (let total = 1; total <= 30; total++) {
      for (let current = 1; current <= total; current++) {
        const pages = pageNumbers(current, total)
        assert.equal(pages[0], 1, `first page missing at ${current}/${total}`)
        assert.equal(
          pages.at(-1),
          total,
          `last page missing at ${current}/${total}`
        )
        // Ascending, and no page outside the range — an out-of-range number
        // would be an unclickable dead end.
        const numbers = pages.filter((p): p is number => p !== "…")
        assert.deepEqual(
          numbers,
          [...numbers].sort((a, b) => a - b),
          `not ascending at ${current}/${total}`
        )
        assert.equal(
          new Set(numbers).size,
          numbers.length,
          `repeat at ${current}/${total}`
        )
        for (const page of numbers) {
          assert.ok(
            page >= 1 && page <= total,
            `out of range at ${current}/${total}`
          )
        }
      }
    }
  })
})
