import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  deriveOwnerHash,
  generateWarpKey,
  readKeyFromFragment,
  warpKeyLink,
} from "./warp-key.ts"

describe("WarpKey", () => {
  it("generates 32-byte URL-safe keys", () => {
    const first = generateWarpKey()
    const second = generateWarpKey()

    assert.match(first, /^[A-Za-z0-9_-]{43}$/)
    assert.notEqual(first, second)
  })

  it("derives the expected SHA-256 owner hash", async () => {
    assert.equal(
      await deriveOwnerHash("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })

  it("reads named and bare URL fragments", () => {
    assert.equal(readKeyFromFragment("#key=secret"), "secret")
    assert.equal(readKeyFromFragment("#bare-key"), "bare-key")
    assert.equal(readKeyFromFragment("#key="), null)
    assert.equal(readKeyFromFragment("#other=value"), null)
    assert.equal(readKeyFromFragment(""), null)
  })

  it("keeps the key in the fragment", () => {
    assert.equal(
      warpKeyLink("secret", "https://nuspace.kz"),
      "https://nuspace.kz/t#key=secret"
    )
  })
})
