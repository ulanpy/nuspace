import { test } from "node:test"
import assert from "node:assert/strict"
import { isSafeHref, safeHref } from "./sanitize"

test("isSafeHref blocks dangerous URL schemes", () => {
  assert.equal(isSafeHref("javascript:alert(1)"), false)
  assert.equal(isSafeHref("JaVaScRiPt:alert(1)"), false)
  assert.equal(isSafeHref("vbscript:x"), false)
  assert.equal(isSafeHref("data:text/html,x"), false)
  assert.equal(isSafeHref("java%73cript:alert(1)"), false)
  assert.equal(isSafeHref("//example.com/path"), true)
  assert.equal(isSafeHref("https://example.com"), true)
  assert.equal(isSafeHref("mailto:hi@example.com"), true)
})

test("safeHref drops dangerous hrefs without panicking", () => {
  assert.equal(safeHref("javascript:alert(1)"), undefined)
  assert.equal(safeHref("https://example.com"), "https://example.com")
  assert.equal(safeHref(undefined), undefined)
  assert.equal(safeHref(""), undefined)
})
