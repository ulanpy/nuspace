import { api, unwrap } from "@/api/client"
import type {
  Media,
  MediaFormat,
  SaveWithMediaResult,
  SignedUrlRequest,
  SignedUrlResponse,
} from "./types"
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_BATCH,
} from "./constants"

/**
 * Step 1 of the upload: ask the backend to sign one PUT per file.
 *
 * The response comes back in request order, which is what lets the caller pair
 * each target with the File it was issued for.
 */
export function requestUploadUrls(requests: SignedUrlRequest[]) {
  return unwrap(api.POST("/bucket/upload-url", { body: requests }))
}

/**
 * Resolve raw GCS filenames into displayable download URLs.
 *
 * Page content (Puck) stores filenames, not URLs: production URLs are signed
 * V4 links that expire in ~15 min, so persisting them would break the public
 * page shortly after upload. The backend re-signs on demand instead.
 */
export function resolveFileUrls(filenames: string[]) {
  return unwrap(api.POST("/media/resolve-urls", { body: { filenames } })).then(
    (res) => res.urls
  )
}

/** A failed PUT to the bucket. Not an ApiError — this never touched our API. */
export class MediaUploadError extends Error {
  readonly status: number
  readonly filename: string

  constructor(filename: string, status: number, body: string) {
    super(`Upload of ${filename} failed with ${String(status)}: ${body}`)
    this.name = "MediaUploadError"
    this.status = status
    this.filename = filename
  }
}

/**
 * Step 2 of the upload: PUT the bytes at the signed URL.
 *
 * Deliberately plain `fetch` rather than the openapi client. In production this
 * URL is Google Cloud Storage, not our API, and must not carry session cookies
 * — fetch's default `credentials: "same-origin"` is doing real work here.
 *
 * The x-goog-meta-* headers are covered by the V4 signature, so they are
 * replayed exactly as issued. Every value comes off the response and none is
 * re-derived from the File: a Content-Type of `file.type` instead of the signed
 * `mime_type` is enough for GCS to answer 403 SignatureDoesNotMatch.
 *
 * Step 3 is not the client's: GCS notifies Pub/Sub, which calls
 * POST /bucket/gcs-hook, and the backend creates the Media row from these same
 * headers. That happens *after* this resolves, so a refetch immediately on
 * success can legitimately come back without the new image. Locally the
 * emulator has no Pub/Sub and the backend instead creates the row up front, in
 * step 1 — so the race exists in production only, which is the awkward way
 * round. Callers that must show the result should tolerate a brief absence
 * rather than treat it as failure.
 */
export async function uploadToSignedUrl(
  target: SignedUrlResponse,
  file: File,
  signal?: AbortSignal
): Promise<SignedUrlResponse> {
  const response = await fetch(target.upload_url, {
    method: "PUT",
    headers: {
      "x-goog-meta-filename": target.filename,
      "x-goog-meta-media-table": target.entity_type,
      "x-goog-meta-entity-id": String(target.entity_id),
      "x-goog-meta-media-format": target.media_format,
      "x-goog-meta-media-order": String(target.media_order),
      "x-goog-meta-mime-type": target.mime_type,
      "Content-Type": target.mime_type,
    },
    body: file,
    signal,
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new MediaUploadError(file.name, response.status, body.slice(0, 200))
  }

  return target
}

/**
 * Pick one image out of an entity's media by format.
 *
 * Formats are not interchangeable, and the backend filters on them in the
 * query rather than returning everything:
 *
 *   events      → `carousel` only  (campuscurrent/events/repository.list_media)
 *   communities → `profile` and `banner`
 *
 * So asking an entity for a format it never carries renders nothing, with no
 * error anywhere — the generated types can't catch it, since `media_format` is
 * a valid value on the response either way. The first port of the event detail
 * page looked for a `banner` on an event and silently showed no poster at all.
 */
export function selectMedia(
  media: readonly Media[] | null | undefined,
  format: MediaFormat
): Media | undefined {
  return media?.find((item) => item.media_format === format)
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

/**
 * Waiting for an entity's images to actually exist.
 *
 * This is required, not belt-and-braces. In production the client's PUT goes
 * straight to Google Cloud Storage; the `Media` row is only written when GCS
 * notifies Pub/Sub and Pub/Sub calls `POST /bucket/gcs-hook`. That happens
 * *after* the PUT resolves, so awaiting the upload proves the bytes arrived and
 * nothing more — refetching the entity right afterwards legitimately returns it
 * with an empty `media` array.
 *
 * Locally the emulator has no Pub/Sub, so the backend creates the row up front
 * at signing time and the race never appears. The awkward consequence is that
 * removing this code would look completely fine in development. See the note in
 * `lib/media/functions.ts`.
 */

/** Retry shape ported from the old app's `utils/polling.ts`. */
const DEFAULT_ATTEMPTS = 5
const INITIAL_DELAY_MS = 1000
const MAX_DELAY_MS = 10_000
const BACKOFF_RATE = 1.5

export interface PollForMediaOptions<T> {
  /** Refetches the entity. Called once per attempt. */
  fetch: () => Promise<T>
  /** Whether the fetched entity now carries the media we are waiting for. */
  isReady: (value: T) => boolean
  /** Total number of fetches, including the first. */
  attempts?: number
  signal?: AbortSignal
}

/**
 * Refetches until `isReady`, backing off between attempts.
 *
 * Resolves with the ready entity, or `null` if it never arrived within the
 * attempt budget. Running out is not an error: the upload succeeded and the
 * hook is merely slow, so callers should invalidate and let the image show up
 * on the next natural refetch rather than telling the user something broke.
 *
 * A fetch that throws counts as "not ready yet" rather than aborting the poll.
 * The entity has already been created at this point — a transient failure while
 * checking on its images is not worth surfacing as a failed submission.
 */
export async function pollForMedia<T>({
  fetch,
  isReady,
  attempts = DEFAULT_ATTEMPTS,
  signal,
}: PollForMediaOptions<T>): Promise<T | null> {
  let delay = INITIAL_DELAY_MS

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return null

    try {
      const value = await fetch()
      if (isReady(value)) return value
    } catch {
      // Deliberately ignored — see above.
    }

    if (attempt < attempts - 1) {
      await sleep(delay, signal)
      delay = Math.min(delay * BACKOFF_RATE, MAX_DELAY_MS)
    }
  }

  return null
}

/** Whether an entity carries at least one image in the given format. */
export function hasMediaFormat(
  media: readonly { media_format: string }[] | null | undefined,
  format: string
): boolean {
  return media?.some((item) => item.media_format === format) ?? false
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms)
    signal?.addEventListener("abort", finish, { once: true })

    function finish() {
      clearTimeout(timer)
      signal?.removeEventListener("abort", finish)
      resolve()
    }
  })
}

/** Whether a picked file is something we are willing to hand to the bucket. */
export function validateImage(file: File): string | null {
  const accepted: readonly string[] = ACCEPTED_IMAGE_TYPES
  if (!accepted.includes(file.type)) {
    return `${file.name}: unsupported file type`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: larger than ${String(MAX_IMAGE_BYTES / 1024 / 1024)} MB`
  }
  return null
}

/** Refuse an invalid batch before an entity is created or updated. */
export function assertValidImageBatch(files: readonly File[]): void {
  if (files.length > MAX_UPLOAD_BATCH) {
    throw new Error(
      `Can upload at most ${String(MAX_UPLOAD_BATCH)} files at a time.`
    )
  }

  const rejected = files
    .map(validateImage)
    .filter((problem) => problem !== null)
  if (rejected.length > 0) {
    throw new Error(rejected.join("; "))
  }
}
