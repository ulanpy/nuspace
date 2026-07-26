import assert from "node:assert/strict"
import test from "node:test"

import {
  SIDEBAR_COLLAPSED_KEY,
  parseSidebarCollapsed,
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "./sidebar-preference.ts"

test("parses only the legacy true value as collapsed", () => {
  assert.equal(parseSidebarCollapsed("true"), true)
  assert.equal(parseSidebarCollapsed("false"), false)
  assert.equal(parseSidebarCollapsed("1"), false)
  assert.equal(parseSidebarCollapsed("TRUE"), false)
  assert.equal(parseSidebarCollapsed(null), false)
})

test("reads and writes the legacy preference key", () => {
  const values = new Map<string, string>([[SIDEBAR_COLLAPSED_KEY, "true"]])
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }

  assert.equal(readSidebarCollapsed(storage), true)
  writeSidebarCollapsed(storage, false)
  assert.equal(values.get(SIDEBAR_COLLAPSED_KEY), "false")
})

test("storage failures fall back without breaking navigation", () => {
  const unavailableStorage = {
    getItem: () => {
      throw new Error("unavailable")
    },
    setItem: () => {
      throw new Error("unavailable")
    },
  }

  assert.equal(readSidebarCollapsed(unavailableStorage), false)
  assert.doesNotThrow(() => {
    writeSidebarCollapsed(unavailableStorage, true)
  })
})
