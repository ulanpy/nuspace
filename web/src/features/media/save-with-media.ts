export type MediaSaveStatus = "none" | "uploaded" | "failed"

export interface SaveWithMediaResult<Entity> {
  entity: Entity
  mediaStatus: MediaSaveStatus
  successfulUploadCount: number
}

/**
 * An upload batch can partially succeed because its PUTs run in parallel.
 * Keeping that count lets callers refresh only for media that can really land.
 */
export class MediaUploadBatchError extends Error {
  successfulUploadCount: number

  constructor(message: string, successfulUploadCount: number) {
    super(message)
    this.name = "MediaUploadBatchError"
    this.successfulUploadCount = successfulUploadCount
  }
}

interface SaveWithMediaOptions<Entity> {
  /** Runs synchronously before the entity request. */
  validate: () => void
  saveEntity: () => Promise<Entity>
  /** Omit when no new media was selected. */
  uploadMedia?: (entity: Entity) => Promise<number>
}

/**
 * Save the durable entity first, then treat its optional media as best-effort.
 *
 * Validation and entity failures reject. Once the entity exists, however, an
 * upload failure becomes a successful save with a warning outcome. Retrying
 * the whole form at that point would create a duplicate entity.
 */
export async function saveWithMedia<Entity>({
  validate,
  saveEntity,
  uploadMedia,
}: SaveWithMediaOptions<Entity>): Promise<SaveWithMediaResult<Entity>> {
  validate()
  const entity = await saveEntity()

  if (!uploadMedia) {
    return {
      entity,
      mediaStatus: "none",
      successfulUploadCount: 0,
    }
  }

  try {
    const successfulUploadCount = await uploadMedia(entity)
    return {
      entity,
      mediaStatus: "uploaded",
      successfulUploadCount,
    }
  } catch (error) {
    return {
      entity,
      mediaStatus: "failed",
      successfulUploadCount:
        error instanceof MediaUploadBatchError
          ? error.successfulUploadCount
          : 0,
    }
  }
}
