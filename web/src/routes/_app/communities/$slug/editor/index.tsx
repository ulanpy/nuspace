import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/communities/editor"
import { communityDetailQueryOptions } from "@/lib/communities"

export const Route = createFileRoute("/_app/communities/$slug/editor/")({
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
  component: CommunityEditorRoute,
})

function CommunityEditorRoute() {
  const { slug } = Route.useParams()
  const { queryClient } = Route.useRouteContext()

  return <Page slug={slug} queryClient={queryClient} />
}
