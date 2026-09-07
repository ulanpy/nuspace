import { createContext, useContext } from "react"

export interface UploadContextData {
  entityType: string
  entityId: number
}

export const UploadContext = createContext<UploadContextData | null>(null)

export function useUploadContext(): UploadContextData | null {
  return useContext(UploadContext)
}
