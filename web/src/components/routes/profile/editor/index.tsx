import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, unwrap } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import { useCurrentUser } from "@/hooks/use-session"
import { Editor } from "@/components/shared/page-editor/components/editor"
import { UploadContext } from "@/components/shared/page-editor/context"

/**
 * The Puck editor for the signed-in user's own page.
 *
 * The community editor with three things swapped: the page comes from the
 * session rather than a slug lookup, publishing is `PATCH /users/me`, and the
 * upload context points at `users`. The editor shell itself is shared
 * unchanged — that is the point of `shared/page-editor`.
 */
export function Page({ queryClient }: { queryClient: QueryClient }) {
  const user = useCurrentUser()
  const navigate = useNavigate()

  // The editor owns its own working copy; publishing sends the whole thing.
  const [pageContent] = useState<Record<string, unknown>>(user.page_content)

  const handlePublish = (data: Record<string, unknown>) => {
    const loading = toast.loading("Publishing page…")
    unwrap(
      api.PATCH("/users/me", {
        body: { page_content: data },
      })
    )
      .then(async () => {
        toast.success("Page published.", { id: loading })
        // Two caches: the session holds the owner's own copy of the page, and
        // `qk.users` holds the public one every other reader sees.
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: qk.session() }),
          queryClient.invalidateQueries({ queryKey: qk.users.all() }),
        ])
        void navigate({ to: "/profile/general" })
      })
      .catch((error) => {
        toast.error(apiErrorMessage(error, "Could not publish. Try again."), {
          id: loading,
        })
      })
  }

  return (
    <UploadContext.Provider
      value={{ entityType: "users", entityId: user.id }}
    >
      <div className="h-dvh">
        <Editor
          data={pageContent}
          onPublish={handlePublish}
          onCancel={() => {
            void navigate({ to: "/profile/general" })
          }}
        />
      </div>
    </UploadContext.Provider>
  )
}
