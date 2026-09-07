/**
 * POST /bucket/upload-url answers 400 for anything larger, so the whole batch
 * is refused rather than partially issued.
 */
export const MAX_UPLOAD_BATCH = 5

/** What the entity forms accept. GCS itself does not restrict the type. */
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

/**
 * Client-side ceiling. Nothing server-side enforces a per-file size: the signed
 * URL points straight at GCS in production, and the emulator path goes through
 * nginx, which allows 100m. This keeps a mis-picked RAW photo from silently
 * costing a student their mobile data.
 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
