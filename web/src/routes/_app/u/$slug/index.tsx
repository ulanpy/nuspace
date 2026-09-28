import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/u/$slug"
import { NotFound } from "@/components/shared/not-found"
import { userPageQueryOptions } from "@/lib/user"

export const Route = createFileRoute("/_app/u/$slug/")({
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        userPageQueryOptions(params.slug)
      )
    } catch (error) {
      // A private page is a 404 for everyone but its owner, guests included —
      // so the 404 must not become a login redirect, which is what makes this
      // route's existence a disclosure in the first place.
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Profile not found"
      description="We couldn’t find a profile at that address. It may be private, or the handle may be wrong."
      to="/"
      actionLabel="Back to Nuspace"
    />
  ),
  component: PublicProfileRoute,
})

function PublicProfileRoute() {
  const { slug } = Route.useParams()

  return <Page slug={slug} />
}
