import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_HIDE_EXPIRED,
  activeFilterCount,
  clearFilters,
  toApiFilters,
  toSelection,
  valuesToYears,
  yearsToValues,
} from "./filters"

const NONE = { hideExpired: true }

test("sends nothing for a search with no filters, except hiding expired", () => {
  assert.deepEqual(toApiFilters(NONE), {
    type: undefined,
    majors: undefined,
    education_level: undefined,
    years: undefined,
    q: undefined,
    hide_expired: true,
  })
})

test("maps each URL filter onto the API parameter the backend reads", () => {
  assert.deepEqual(
    toApiFilters({
      type: ["research", "grant"],
      majors: ["Computer Science"],
      education: ["UG", "PhD"],
      years: [1, 3],
      q: "  summer ",
      hideExpired: false,
    }),
    {
      type: ["research", "grant"],
      majors: ["Computer Science"],
      education_level: ["UG", "PhD"],
      years: [1, 3],
      q: "summer",
      hide_expired: false,
    }
  )
})

test("treats empty lists and a blank query as no filter", () => {
  const api = toApiFilters({
    type: [],
    majors: [],
    education: [],
    years: [],
    q: "   ",
    hideExpired: true,
  })
  assert.equal(api.type, undefined)
  assert.equal(api.majors, undefined)
  assert.equal(api.education_level, undefined)
  assert.equal(api.years, undefined)
  assert.equal(api.q, undefined)
})

test("gives an equal API filter for equal searches, so the query key is stable", () => {
  const a = toApiFilters({ type: ["grant"], hideExpired: true })
  const b = toApiFilters({ type: ["grant"], hideExpired: true })
  assert.deepEqual(a, b)
})

test("counts the selected values and a toggle moved off its default", () => {
  assert.equal(activeFilterCount(NONE), 0)
  assert.equal(
    activeFilterCount({
      type: ["research", "grant"],
      education: ["UG"],
      years: [2],
      majors: ["Finance", "Physics"],
      hideExpired: true,
    }),
    6
  )
  assert.equal(activeFilterCount({ hideExpired: false }), 1)
})

test("does not count the search box as a filter", () => {
  assert.equal(activeFilterCount({ q: "grant", hideExpired: true }), 0)
})

test("clear resets every filter and the toggle but keeps the query", () => {
  assert.deepEqual(
    clearFilters({
      type: ["research"],
      majors: ["Finance"],
      education: ["GrM"],
      years: [1],
      q: "grant",
      hideExpired: false,
    }),
    {
      type: undefined,
      majors: undefined,
      education: undefined,
      years: undefined,
      q: "grant",
      hideExpired: DEFAULT_HIDE_EXPIRED,
    }
  )
})

test("an empty selection becomes undefined so the URL stays clean", () => {
  assert.equal(toSelection([]), undefined)
  assert.deepEqual(toSelection(["a", "b"]), ["a", "b"])
})

test("years round-trip between the numbers in the URL and the option values", () => {
  assert.deepEqual(yearsToValues([1, 4]), ["1", "4"])
  assert.deepEqual(yearsToValues(undefined), [])
  assert.deepEqual(valuesToYears(["2", "3"]), [2, 3])
  assert.equal(valuesToYears([]), undefined)
})
