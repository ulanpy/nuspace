import { createContext, useContext } from "react"

export interface UploadContextData {
  /**
   * Narrowed to `"pages"` on purpose.
   *
   * The page editor is the only place that uploads, and the only entity it
   * uploads to is the page being edited. `entity_type: users` is still in the
   * backend enum for the deferred media cleanup, so the generated
   * `EntityType` still offers it — a wider context would let a future block
   * address a user that has no media table any more.
   */
  entityType: "pages"
  entityId: number
}

export const UploadContext = createContext<UploadContextData | null>(null)

export function useUploadContext(): UploadContextData | null {
  return useContext(UploadContext)
}
