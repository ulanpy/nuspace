import { api, unwrap } from "@/api/client"
import type {
  SignedUrlRequest,
  SignedUrlResponse,
} from "@/features/media/types"

/**
 * Step 1 of the upload: ask the backend to sign one PUT per file.
 *
 * The response comes back in request order, which is what lets the caller pair
 * each target with the File it was issued for.
 */
export function requestUploadUrls(requests: SignedUrlRequest[]) {
  return unwrap(api.POST("/bucket/upload-url", { body: requests }))
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
