import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/u/$slug/editor"
import { userPageQueryOptions } from "@/lib/user"

/**
 * A sibling of the settings layout, not a child of it: the editor wants the
 * whole viewport, and it wants none of the settings chrome. Nested under the
 * layout it inherited a tab bar with no selected tab, and base-ui reports its
 * fallback selection as a change — which navigated away on mount.
 */
export const Route = createFileRoute("/_app/u/$slug/editor/")({
  loader: async ({ context, params }) => {
    const session = context.session
    if (!session) {
      throw notFound()
    }

    let page
    try {
      page = await context.queryClient.ensureQueryData(
        userPageQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }

    if (page.sub !== session.user.sub) {
      throw notFound()
    }

    return { page }
  },
  component: UserEditorRoute,
})

function UserEditorRoute() {
  const { slug } = Route.useParams()
  const { queryClient } = Route.useRouteContext()

  return <Page slug={slug} queryClient={queryClient} />
}
