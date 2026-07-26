import { useCallback, useState } from "react"
import { useMutation } from "@tanstack/react-query"

import {
  MediaUploadError,
  requestUploadUrls,
  uploadToSignedUrl,
} from "@/features/media/api"
import {
  MAX_UPLOAD_BATCH,
  type EntityType,
  type MediaFormat,
  type SignedUrlResponse,
  validateImage,
} from "@/features/media/types"

/** One file and where it belongs in the entity's gallery. */
export interface UploadItem {
  file: File
  mediaFormat: MediaFormat
  /** Position within the gallery; the backend sorts on it. */
  mediaOrder: number
}

export interface UploadRequest {
  entityType: EntityType
  entityId: number
  items: UploadItem[]
}

export type UploadStatus = "pending" | "uploading" | "done" | "error"

/**
 * The 3-step presigned upload, as one hook.
 *
 * Replaces the old app's 484-line unified-media-upload-zone plus the two media
 * Context providers that threaded its state around. The zone was a file picker
 * welded to the transfer logic; this is only the transfer, so the picker can be
 * whatever a given form needs.
 *
 * Files go up in parallel and are reported individually: a batch where one of
 * four fails still uploaded three, and the caller needs to know which. The
 * mutation rejects if any file failed, after all of them have settled.
 */
export function useMediaUpload() {
  const [statuses, setStatuses] = useState<UploadStatus[]>([])

  const markStatus = useCallback((index: number, status: UploadStatus) => {
    setStatuses((previous) => {
      const next = [...previous]
      next[index] = status
      return next
    })
  }, [])

  const mutation = useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      items,
    }: UploadRequest): Promise<SignedUrlResponse[]> => {
      if (items.length === 0) return []

      if (items.length > MAX_UPLOAD_BATCH) {
        throw new Error(
          `Can upload at most ${String(MAX_UPLOAD_BATCH)} files at a time.`
        )
      }

      // Reject the batch before signing anything: a URL issued for a file we
      // then refuse to send is a signature nobody redeems.
      const rejected = items
        .map((item) => validateImage(item.file))
        .filter(Boolean)
      if (rejected.length > 0) {
        throw new Error(rejected.join("; "))
      }

      setStatuses(items.map(() => "pending"))

      const targets = await requestUploadUrls(
        items.map((item) => ({
          entity_type: entityType,
          entity_id: entityId,
          media_format: item.mediaFormat,
          media_order: item.mediaOrder,
          mime_type: item.file.type,
        }))
      )

      // The backend appends one target per request item in order, so index is
      // the pairing. Nothing in the payload identifies the file otherwise —
      // `filename` is a server-generated uuid, not the name we sent.
      const settled = await Promise.allSettled(
        targets.map(async (target, index) => {
          markStatus(index, "uploading")
          try {
            const result = await uploadToSignedUrl(target, items[index].file)
            markStatus(index, "done")
            return result
          } catch (error) {
            markStatus(index, "error")
            throw error
          }
        })
      )

      const failures = settled.filter((result) => result.status === "rejected")
      if (failures.length > 0) {
        const reasons = failures.map((failure) =>
          failure.reason instanceof MediaUploadError
            ? failure.reason.message
            : String(failure.reason)
        )
        throw new Error(
          `${String(failures.length)} of ${String(items.length)} uploads failed: ${reasons.join("; ")}`
        )
      }

      return settled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value)
    },
  })

  const reset = useCallback(() => {
    setStatuses([])
    mutation.reset()
  }, [mutation])

  return {
    uploadMedia: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    /** Per-file state, positionally aligned with the `items` passed in. */
    statuses,
    reset,
  }
}
