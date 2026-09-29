import { createFileRoute, notFound } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { Page } from "@/components/routes/pages/editor"
import { pageDetailQueryOptions } from "@/lib/pages"

/**
 * A sibling of the settings layout, not a child of it: the editor wants the
 * whole viewport, and it wants none of the settings chrome. Nested under the
 * layout it inherited a tab bar with no selected tab, and base-ui reports its
 * fallback selection as a change — which navigated away on mount.
 */
export const Route = createFileRoute("/_app/p/$slug/editor/")({
  loader: async ({ context, params }) => {
    let page
    try {
      page = await context.queryClient.ensureQueryData(
        pageDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }

    // Guard the editor, not just the write. It used to check 404 only, on the
    // reasoning that `PATCH` rejects an unauthorised save anyway — so the
    // route existed for anyone who could spell a slug, and they could open the
    // editor and start a draft they had no right to design. The server still
    // refuses the write; this keeps the door shut before it opens.
    if (!page.permissions.can_edit) throw notFound()

    return { page }
  },
  component: PageEditorRoute,
})

function PageEditorRoute() {
  const { slug } = Route.useParams()
  const { queryClient } = Route.useRouteContext()

  return <Page slug={slug} queryClient={queryClient} />
}
