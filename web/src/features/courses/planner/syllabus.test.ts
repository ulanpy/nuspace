import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  normalizeCourseCode,
  parseSyllabusLinks,
  syllabusLink,
} from "./syllabus.ts"

describe("syllabus links", () => {
  it("normalizes codes and expands slash-separated aliases", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        "CS 101/CSCI 101,Intro,https://example.test/syllabus",
      ].join("\n")
    )

    assert.equal(normalizeCourseCode("  cs   101 "), "CS 101")
    assert.equal(
      syllabusLink(links, "csci 101"),
      "https://example.test/syllabus"
    )
  })

  it("keeps the first published link for a duplicate code", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        "CS 101,Intro,https://example.test/first",
        "CS 101,Intro,https://example.test/second",
      ].join("\n")
    )
    assert.equal(links["CS 101"], "https://example.test/first")
  })

  it("reads the final URL column when a quoted course title has commas", () => {
    const links = parseSyllabusLinks(
      [
        "course_code,course_name,link",
        'HST 242,"History: Politics, Society, Culture",https://example.test/hst',
      ].join("\n")
    )
    assert.equal(links["HST 242"], "https://example.test/hst")
  })
})
