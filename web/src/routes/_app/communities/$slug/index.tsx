import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { CommunityNotFound, Page } from "@/components/routes/communities/$slug"
import { communityDetailQueryOptions } from "@/lib/communities"

export const Route = createFileRoute("/_app/communities/$slug/")({
  validateSearch: (search: Record<string, unknown>): { admin?: string } => ({
    admin: typeof search.admin === "string" ? search.admin : undefined,
  }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: CommunityNotFound,
  component: CommunityDetailRoute,
})

function CommunityDetailRoute() {
  const { slug } = Route.useParams()
  const { admin } = Route.useSearch()

  return <Page slug={slug} adminToken={admin} />
}
