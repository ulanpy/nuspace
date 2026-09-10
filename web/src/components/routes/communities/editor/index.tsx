import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, unwrap } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { communityDetailQueryOptions } from "@/lib/communities"
import { Editor } from "@/components/shared/page-editor/components/editor"
import { UploadContext } from "@/components/shared/page-editor/context"
import { qk } from "@/api/query-keys"

export function Page({
  slug,
  queryClient,
}: {
  slug: string
  queryClient: QueryClient
}) {
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )
  const navigate = useNavigate()

  const [pageContent] = useState(community.page_content ?? {})

  const handlePublish = (data: Record<string, unknown>) => {
    const loading = toast.loading("Publishing page\u2026")
    unwrap(
      api.PATCH("/communities/{slug}", {
        params: { path: { slug } },
        body: { page_content: data },
      })
    )
      .then(() => {
        toast.success("Page published.", { id: loading })
        void queryClient.invalidateQueries({
          queryKey: qk.communities.all(),
        })
        void navigate({
          to: "/communities/$slug",
          params: { slug },
        })
      })
      .catch((error) => {
        toast.error(apiErrorMessage(error, "Could not publish. Try again."), {
          id: loading,
        })
      })
  }

  return (
    <UploadContext.Provider
      value={{ entityType: "communities", entityId: community.id }}
    >
<div className="h-[100dvh]">
        <Editor
          data={pageContent}
          onPublish={handlePublish}
          onCancel={() =>
            navigate({ to: "/communities/$slug", params: { slug } })
          }
        />
      </div>
    </UploadContext.Provider>
  )
}
