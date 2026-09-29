import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/pages/$slug"
import { NotFound } from "@/components/shared/not-found"
import { pageDetailQueryOptions } from "@/lib/pages"

export const Route = createFileRoute("/_app/p/$slug/")({
  validateSearch: (search: Record<string, unknown>): { admin?: string } => ({
    admin: typeof search.admin === "string" ? search.admin : undefined,
  }),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        pageDetailQueryOptions(params.slug)
      )
    } catch (error) {
      // A non-public page is a 404 for everyone but its owner, guests
      // included — so the 404 must not become a login redirect, which is what
      // makes this route's existence a disclosure in the first place.
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Page not found"
      description="We couldn’t find a page at that address. It may be private, or the handle may be wrong."
      to="/mynuspace"
      actionLabel="Browse pages"
    />
  ),
  component: PageDetailRoute,
})

function PageDetailRoute() {
  const { slug } = Route.useParams()
  const { admin } = Route.useSearch()

  return <Page slug={slug} adminToken={admin} />
}
