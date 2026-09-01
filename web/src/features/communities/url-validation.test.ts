import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  getHttpsUrlError,
  getInstagramUrlError,
  getTelegramUrlError,
  normalizeHttpUrl,
} from "./url-validation.ts"

describe("community URL validation", () => {
  it("normalizes domains without changing explicit schemes", () => {
    assert.equal(normalizeHttpUrl(" t.me/community "), "https://t.me/community")
    assert.equal(
      normalizeHttpUrl("http://t.me/community"),
      "http://t.me/community"
    )
    assert.equal(
      normalizeHttpUrl("wtf://t.me/community"),
      "wtf://t.me/community"
    )
    assert.equal(normalizeHttpUrl("  "), undefined)
  })

  it("accepts only Telegram hosts, including www", () => {
    for (const value of [
      "https://t.me/community",
      "https://www.t.me/community",
      "http://telegram.me/community",
    ]) {
      assert.equal(getTelegramUrlError(value), undefined)
    }

    for (const value of [
      "https://telegram.org/community",
      "https://evil.t.me/community",
      "https://t.me:invalid/community",
      "wtf://t.me/community",
      "https://wtf://t.me/community",
    ]) {
      assert.equal(getTelegramUrlError(value), "Enter a Telegram URL")
    }
  })

  it("accepts only Instagram hosts, including www", () => {
    for (const value of [
      "https://instagram.com/community",
      "https://www.instagram.com/community",
      "http://instagr.am/community",
    ]) {
      assert.equal(getInstagramUrlError(value), undefined)
    }

    for (const value of [
      "https://help.instagram.com/community",
      "https://evil.instagr.am/community",
      "wtf://instagram.com/community",
      "https://wtf://instagram.com/community",
    ]) {
      assert.equal(getInstagramUrlError(value), "Enter an Instagram URL")
    }
  })

  it("requires HTTPS", () => {
    assert.equal(getHttpsUrlError("https://example.com/apply"), undefined)
    assert.equal(
      getHttpsUrlError("http://example.com/apply"),
      "Enter an HTTPS URL"
    )
    assert.equal(
      getHttpsUrlError("https://wtf://example.com"),
      "Enter an HTTPS URL"
    )
  })
})
