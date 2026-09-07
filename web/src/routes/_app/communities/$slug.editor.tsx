import { useState } from "react"
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"

import { ApiError, api, unwrap } from "@/api/client"
import { apiErrorMessage } from "@/api/errors"
import { communityDetailQueryOptions } from "@/features/communities/api"
import { Editor } from "@/features/page-editor/components/editor"
import { UploadContext } from "@/features/page-editor/context"
import { toast } from "sonner"
import { qk } from "@/api/query-keys"

export const Route = createFileRoute("/_app/communities/$slug/editor")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }
  },
  component: CommunityEditorPage,
})

function CommunityEditorPage() {
  const { slug } = Route.useParams()
  const { data: community } = useSuspenseQuery(
    communityDetailQueryOptions(slug)
  )
  const navigate = useNavigate()
  const queryClient = Route.useRouteContext().queryClient

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
        <Editor data={pageContent} onPublish={handlePublish} />
      </div>
    </UploadContext.Provider>
  )
}
