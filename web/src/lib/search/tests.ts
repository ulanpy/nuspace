import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  countLine,
  dedupeResults,
  emptySuggestion,
  isSearchKind,
  snippetSegments,
  sourceDateLabel,
} from "./functions"
import type { SearchResult } from "./types"

const result = (id: string, title = id): SearchResult => ({
  id,
  kind: "page",
  title,
  url: `https://pages.nuspace.kz/${id}`,
  host: "pages.nuspace.kz",
  path: id,
  date: null,
  snippet: null,
  visibility: null,
  facts: [],
})

describe("dedupeResults", () => {
  it("joins the pages in order", () => {
    const pages = [[result("a"), result("b")], [result("c")]]

    assert.deepEqual(
      dedupeResults(pages).map((each) => each.id),
      ["a", "b", "c"]
    )
  })

  it("drops a result a later page repeats, keeping where it was first shown", () => {
    // The corpus changed between the two requests and `b` slid onto page two.
    const pages = [
      [result("a"), result("b")],
      [result("b", "B, refetched"), result("c")],
    ]

    const deduped = dedupeResults(pages)

    assert.deepEqual(
      deduped.map((each) => each.id),
      ["a", "b", "c"]
    )
    assert.equal(deduped[1].title, "b")
  })

  it("drops a repeat within one page too", () => {
    assert.deepEqual(
      dedupeResults([[result("a"), result("a")]]).map((each) => each.id),
      ["a"]
    )
  })

  it("keeps two kinds that share a primary key apart", () => {
    assert.equal(
      dedupeResults([[result("page:1"), result("event:1")]]).length,
      2
    )
  })

  it("returns nothing for no pages", () => {
    assert.deepEqual(dedupeResults([]), [])
  })
})

describe("snippetSegments", () => {
  it("splits the text around the matches", () => {
    assert.deepEqual(
      snippetSegments({
        text: "Club AI meets in Block C",
        matches: [
          { start: 0, length: 4 },
          { start: 5, length: 2 },
        ],
      }),
      [
        { text: "Club", match: true },
        { text: " ", match: false },
        { text: "AI", match: true },
        { text: " meets in Block C", match: false },
      ]
    )
  })

  it("is the whole text when nothing matched", () => {
    assert.deepEqual(snippetSegments({ text: "We play.", matches: [] }), [
      { text: "We play.", match: false },
    ])
  })

  it("ignores a match that overlaps or runs past the text", () => {
    assert.deepEqual(
      snippetSegments({
        text: "robotics lab",
        matches: [
          { start: 0, length: 8 },
          { start: 4, length: 2 },
          { start: 9, length: 10 },
        ],
      }),
      [
        { text: "robotics", match: true },
        { text: " lab", match: false },
      ]
    )
  })

  it("counts offsets in UTF-16 units, as the backend sends them", () => {
    // "🎉" is two UTF-16 units.
    assert.deepEqual(
      snippetSegments({
        text: "🎉 чемпионат",
        matches: [{ start: 3, length: 9 }],
      }),
      [
        { text: "🎉 ", match: false },
        { text: "чемпионат", match: true },
      ]
    )
  })
})

describe("countLine", () => {
  it("says About N, with a thousands separator", () => {
    assert.equal(countLine(1240), "About 1,240 Sources")
  })

  it("is singular for one", () => {
    assert.equal(countLine(1), "About 1 Source")
  })

  it("is plain for none", () => {
    assert.equal(countLine(0), "No Sources")
  })
})

describe("sourceDateLabel", () => {
  it("names an update", () => {
    assert.equal(
      sourceDateLabel({ role: "updated", value: "2026-10-11T08:00:00+00:00" }),
      "Updated 11 Oct 2026"
    )
  })

  it("names a deadline, read as the local calendar day", () => {
    assert.equal(
      sourceDateLabel({ role: "deadline", value: "2026-11-14" }),
      "Deadline 14 Nov 2026"
    )
  })

  it("shows an event's start as the bare date", () => {
    assert.equal(
      sourceDateLabel({ role: "starts", value: "2026-10-22T12:00:00+00:00" }),
      "22 Oct 2026"
    )
  })

  it("is empty for no date or an unreadable one", () => {
    assert.equal(sourceDateLabel(null), "")
    assert.equal(sourceDateLabel({ role: "starts", value: "soon" }), "")
  })
})

describe("emptySuggestion", () => {
  it("drops the last word of a longer query", () => {
    assert.deepEqual(emptySuggestion("quantum chess club", undefined), {
      label: "Search “quantum chess” instead",
      search: { q: "quantum chess" },
    })
  })

  it("widens a one-word query filtered by kind to every kind", () => {
    assert.deepEqual(emptySuggestion("quantum", "event"), {
      label: "Search every kind for “quantum”",
      search: { q: "quantum" },
    })
  })

  it("offers a suggested term otherwise", () => {
    assert.deepEqual(emptySuggestion("quantum", undefined), {
      label: "Search “dormitory” instead",
      search: { q: "dormitory" },
    })
  })

  it("never suggests the term that found nothing", () => {
    assert.equal(
      emptySuggestion("Dormitory", undefined).search.q,
      "exchange programs"
    )
  })
})

describe("isSearchKind", () => {
  it("accepts the backend's kinds and nothing else", () => {
    assert.equal(isSearchKind("event"), true)
    assert.equal(isSearchKind("all"), false)
    assert.equal(isSearchKind(undefined), false)
  })
})
