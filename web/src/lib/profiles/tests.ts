import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { NEW_PROFILE_DESIGN } from "./constants"
import { designToEdit, handleSchema, profileAddress } from "./functions"

describe("handleSchema", () => {
  const accepts = (value: string) => handleSchema().safeParse(value).success

  it("accepts a slug-shaped handle", () => {
    assert.equal(accepts("aigerim-b"), true)
    assert.equal(accepts("ab1"), true)
  })

  it("refuses what the slug rules refuse", () => {
    for (const handle of [
      "Aigerim",
      "aigerim_b",
      "-aigerim",
      "ai",
      "a".repeat(51),
    ]) {
      assert.equal(accepts(handle), false, handle)
    }
  })

  it("refuses a reserved slug", () => {
    assert.equal(accepts("sgotinish"), false)
  })

  it("refuses the account host's own words", () => {
    for (const handle of ["account", "pages", "profile", "people"]) {
      assert.equal(accepts(handle), false, handle)
    }
  })
})

describe("profileAddress", () => {
  it("names the account host of the environment the viewer is in", () => {
    assert.equal(
      profileAddress("aigerim-b", "my.nuspace.kz"),
      "my.nuspace.kz/u/aigerim-b"
    )
    assert.equal(
      profileAddress("aigerim-b", "my_staging.nuspace.kz"),
      "my_staging.nuspace.kz/u/aigerim-b"
    )
    assert.equal(
      profileAddress("aigerim-b", "my.localhost"),
      "my.localhost/u/aigerim-b"
    )
  })

  it("names production from an unknown host", () => {
    assert.equal(
      profileAddress("aigerim-b", "example.com"),
      "my.nuspace.kz/u/aigerim-b"
    )
  })
})

describe("designToEdit", () => {
  it("opens a profile never saved on the About and Links design", () => {
    const { content } = designToEdit(null)

    assert.ok(Array.isArray(content))
    assert.deepEqual(
      content.map((block: unknown) =>
        typeof block === "object" && block !== null && "type" in block
          ? block.type
          : null
      ),
      ["Heading", "RichText", "Heading", "LinkTree"]
    )
  })

  it("opens a saved profile on what was saved, even an empty design", () => {
    const saved = { content: [], root: { props: {} } }

    assert.equal(designToEdit(saved), saved)
  })

  it("hands out a copy of the template, never the template itself", () => {
    assert.notEqual(designToEdit(null), NEW_PROFILE_DESIGN)
  })
})
