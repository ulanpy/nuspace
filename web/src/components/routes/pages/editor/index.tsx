import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { api, unwrap } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { pageDetailQueryOptions } from "@/lib/pages"
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
  const { data: page } = useSuspenseQuery(pageDetailQueryOptions(slug))
  const navigate = useNavigate()

  const [pageContent] = useState(page.page_content ?? {})

  const handlePublish = (data: Record<string, unknown>) => {
    const loading = toast.loading("Publishing page\u2026")
    unwrap(
      api.PATCH("/pages/{slug}", {
        params: { path: { slug } },
        body: { page_content: data },
      })
    )
      .then(() => {
        toast.success("Page published.", { id: loading })
        void queryClient.invalidateQueries({
          queryKey: qk.pages.all(),
        })
        void navigate({
          to: "/p/$slug",
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
    <UploadContext.Provider value={{ entityType: "pages", entityId: page.id }}>
      <div className="h-dvh">
        <Editor
          data={pageContent}
          onPublish={handlePublish}
          onCancel={() => navigate({ to: "/p/$slug", params: { slug } })}
        />
      </div>
    </UploadContext.Provider>
  )
}
