import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_BATCH,
  assertValidImageBatch,
  validateImage,
} from "./types.ts"

function image(name = "image.png", size = 1, type = "image/png"): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe("image validation", () => {
  it("accepts a supported image within the size limit", () => {
    assert.equal(validateImage(image()), null)
  })

  it("rejects unsupported and oversized images", () => {
    assert.match(
      validateImage(image("photo.heic", 1, "image/heic")) ?? "",
      /unsupported/
    )
    assert.match(
      validateImage(image("huge.png", MAX_IMAGE_BYTES + 1)) ?? "",
      /larger than 10 MB/
    )
  })

  it("rejects an oversized batch before upload", () => {
    assert.throws(
      () =>
        assertValidImageBatch(
          Array.from({ length: MAX_UPLOAD_BATCH + 1 }, () => image())
        ),
      /at most 5 files/
    )
  })
})
