import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { pageRootColors } from "./root-style.ts"

describe("pageRootColors", () => {
  it("reads the nested shape Puck writes today", () => {
    assert.deepEqual(
      pageRootColors({
        root: { props: { backgroundColor: "#101010", textColor: "#fefefe" } },
      }),
      { background: "#101010", foreground: "#fefefe" }
    )
  })

  it("reads the flat shape older saves have", () => {
    assert.deepEqual(
      pageRootColors({ root: { backgroundColor: "#101010" } }),
      { background: "#101010", foreground: "#f8fafc" }
    )
  })

  it("falls back to white with a contrasting foreground", () => {
    assert.deepEqual(pageRootColors({}), {
      background: "#ffffff",
      foreground: "#0f172a",
    })
    assert.deepEqual(pageRootColors(null), {
      background: "#ffffff",
      foreground: "#0f172a",
    })
  })

  it("ignores a colour that is not a string", () => {
    // page_content is a JSON blob, so a hand-edited or half-migrated page can
    // hold anything. A number here must not reach the style attribute.
    assert.deepEqual(pageRootColors({ root: { backgroundColor: 42 } }), {
      background: "#ffffff",
      foreground: "#0f172a",
    })
  })
})
