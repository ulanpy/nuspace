import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { slugSchema } from "./slug.ts"

describe("slugSchema", () => {
  it("accepts an ordinary slug", () => {
    assert.equal(slugSchema().parse("chess-club"), "chess-club")
  })

  for (const slug of ["api", "assets", "data", "settings", "edit"]) {
    it(`rejects "${slug}", which a Page at pages.nuspace.kz/${slug} would lose to`, () => {
      const result = slugSchema().safeParse(slug)
      assert.equal(result.success, false)
      assert.equal(result.error?.issues[0]?.message, "That slug is reserved")
    })
  }
})
