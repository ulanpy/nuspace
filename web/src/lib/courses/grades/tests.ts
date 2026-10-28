import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { gradeBands, normalizeKeyword } from "./functions"

const empty = {
  pct_A: null,
  pct_B: null,
  pct_C: null,
  pct_D: null,
  pct_F: null,
  pct_P: null,
  pct_I: null,
  pct_AU: null,
  pct_W_AW: null,
  grades_count: 100,
}

describe("grade bands", () => {
  it("keeps only bands with students in them, in stacking order", () => {
    const bands = gradeBands({
      ...empty,
      pct_F: 6,
      pct_A: 34.5,
      pct_B: 0,
      pct_W_AW: 2.4,
    })
    assert.deepEqual(
      bands.map((band) => band.label),
      ["A", "F", "W"]
    )
  })

  it("estimates students from the share and the head count", () => {
    const [band] = gradeBands({ ...empty, pct_A: 33.3, grades_count: 84 })
    assert.equal(band?.students, 28)
  })

  it("has no student count when the report has no head count", () => {
    const [band] = gradeBands({ ...empty, pct_A: 50, grades_count: null })
    assert.equal(band?.pct, 50)
    assert.equal(band?.students, null)
  })

  it("is empty for a report with no distribution", () => {
    assert.deepEqual(gradeBands(empty), [])
  })
})

describe("normalizeKeyword", () => {
  it("trims and collapses whitespace", () => {
    assert.equal(normalizeKeyword("  MATH   161 "), "MATH 161")
  })

  it("treats blank and missing as no keyword", () => {
    assert.equal(normalizeKeyword(undefined), undefined)
    assert.equal(normalizeKeyword("   "), undefined)
  })
})
