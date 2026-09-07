import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/communities/settings"
import { communityDetailQueryOptions } from "@/lib/communities"

export const Route = createFileRoute("/_app/communities/$slug/settings/")({
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
  component: CommunitySettingsRoute,
})

function CommunitySettingsRoute() {
  const { slug } = Route.useParams()

  return <Page slug={slug} />
}
