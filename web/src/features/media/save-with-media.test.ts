import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { MediaUploadBatchError, saveWithMedia } from "./save-with-media.ts"

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
