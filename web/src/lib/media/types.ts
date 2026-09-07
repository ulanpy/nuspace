import type { components } from "@/api/schema"

export type Media = components["schemas"]["MediaResponse"]
export type EntityType = components["schemas"]["EntityType"]
export type MediaFormat = components["schemas"]["MediaFormat"]
export type SignedUrlRequest = components["schemas"]["SignedUrlRequest"]
export type SignedUrlResponse = components["schemas"]["SignedUrlResponse"]

export type MediaSaveStatus = "none" | "uploaded" | "failed"

export interface SaveWithMediaResult<Entity> {
  entity: Entity
  mediaStatus: MediaSaveStatus
  successfulUploadCount: number
}
