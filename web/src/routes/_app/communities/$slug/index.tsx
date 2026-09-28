import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/communities/$slug"
import { NotFound } from "@/components/shared/not-found"
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
  notFoundComponent: () => (
    <NotFound
      title="Community not found"
      description="We couldn’t find a community at that address. It may have been renamed or removed."
      to="/communities"
      actionLabel="Browse communities"
    />
  ),
  component: CommunityDetailRoute,
})

function CommunityDetailRoute() {
  const { slug } = Route.useParams()
  const { admin } = Route.useSearch()

  return <Page slug={slug} adminToken={admin} />
}
