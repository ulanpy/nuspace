import { createContext, useContext } from "react"
import type { EntityType } from "@/lib/media"

export interface UploadContextData {
  entityType: EntityType
  entityId: number
}

export const UploadContext = createContext<UploadContextData | null>(null)

export function useUploadContext(): UploadContextData | null {
  return useContext(UploadContext)
}
