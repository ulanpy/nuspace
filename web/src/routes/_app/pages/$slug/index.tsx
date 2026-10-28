import { createFileRoute, notFound, redirect } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { PageViewScreen } from "@/components/routes/pages/$slug"
import { NotFound } from "@/components/shared/not-found"
import { pageDetailQueryOptions } from "@/lib/pages"
import { currentBrowserPath, loginHref } from "@/lib/user"

/** `pages.nuspace.kz/<slug>`: a Page, in its own compact bar and nothing else. */
export const Route = createFileRoute("/_app/pages/$slug/")({
  // A Page is a full-width landing page with its own compact bar.
  staticData: { shell: { bare: true } },
  /**
   * `?admin=<token>` is an admin-invite link, which the backend mints as
   * `https://pages.nuspace.kz/<slug>?admin=<token>`.
   */
  validateSearch: (search: Record<string, unknown>): { admin?: string } => ({
    admin: typeof search.admin === "string" ? search.admin : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    // Only a signed-in viewer can accept an invite, and a `private` Page is a
    // 404 to anyone signed out, so an invitee who is not signed in would be
    // told the Page does not exist. Sign them in first; the login comes back
    // to this same address, token included.
    if (search.admin && !context.session) {
      throw redirect({
        href: loginHref({
          returnTo: currentBrowserPath(window.location),
          origin: window.location.origin,
        }),
        reloadDocument: true,
      })
    }
  },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(
        pageDetailQueryOptions(params.slug)
      )
    } catch (error) {
      // A Page the viewer may not read is a 404 for them, guests included, and
      // never a login redirect: the redirect would confirm the Page exists.
      if (error instanceof ApiError && error.status === 404) {
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <NotFound
      title="Page not found"
      description="We couldn’t find a page at that address. It may be private, or the address may have changed."
    />
  ),
  component: PageViewRoute,
})

function PageViewRoute() {
  const { slug } = Route.useParams()
  const { admin } = Route.useSearch()

  return <PageViewScreen slug={slug} adminToken={admin} />
}
