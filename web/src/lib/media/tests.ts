import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { MAX_IMAGE_BYTES, MAX_UPLOAD_BATCH } from "./constants.ts"
import {
  MediaUploadBatchError,
  assertValidImageBatch,
  saveWithMedia,
  validateImage,
} from "./functions.ts"

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

describe("saveWithMedia", () => {
  it("validates before creating the entity", async () => {
    let saves = 0

    await assert.rejects(
      saveWithMedia({
        validate: () => {
          throw new Error("too large")
        },
        saveEntity: async () => {
          saves += 1
          return { id: 1 }
        },
      }),
      /too large/
    )
    assert.equal(saves, 0)
  })

  it("propagates an entity failure", async () => {
    await assert.rejects(
      saveWithMedia({
        validate: () => undefined,
        saveEntity: () => Promise.reject(new Error("request failed")),
      }),
      /request failed/
    )
  })

  it("reports a successful upload", async () => {
    const result = await saveWithMedia({
      validate: () => undefined,
      saveEntity: async () => ({ id: 1 }),
      uploadMedia: async () => 2,
    })

    assert.deepEqual(result, {
      entity: { id: 1 },
      mediaStatus: "uploaded",
      successfulUploadCount: 2,
    })
  })

  it("keeps an entity save successful when every upload fails", async () => {
    const result = await saveWithMedia({
      validate: () => undefined,
      saveEntity: async () => ({ id: 1 }),
      uploadMedia: () => Promise.reject(new Error("bucket unavailable")),
    })

    assert.deepEqual(result, {
      entity: { id: 1 },
      mediaStatus: "failed",
      successfulUploadCount: 0,
    })
  })

  it("preserves the successful count from a partial batch", async () => {
    const result = await saveWithMedia({
      validate: () => undefined,
      saveEntity: async () => ({ id: 1 }),
      uploadMedia: () =>
        Promise.reject(new MediaUploadBatchError("one failed", 2)),
    })

    assert.deepEqual(result, {
      entity: { id: 1 },
      mediaStatus: "failed",
      successfulUploadCount: 2,
    })
  })
})
