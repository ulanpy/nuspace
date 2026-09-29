import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, PaletteIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { SettingsLayout } from "@/components/layouts/settings"
import { pageDetailQueryOptions } from "@/lib/pages"

export const Route = createFileRoute("/_app/p/$slug/settings")({
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

    // Anyone who can edit may hold settings, which includes a page admin and
    // not just the owner. Everyone else has no business on either tab.
    if (!page.permissions.can_edit) {
      throw redirect({
        to: "/p/$slug",
        params: { slug: params.slug },
      })
    }

    return { page }
  },
  component: PageSettingsLayoutRoute,
})

function PageSettingsLayoutRoute() {
  const { slug } = Route.useParams()

  return (
    <SettingsLayout
      title="Settings"
      sections={[
        {
          to: "/p/$slug/settings/general",
          label: "General",
        },
        {
          to: "/p/$slug/settings/admin-controls",
          label: "Admin controls",
        },
      ]}
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link to="/p/$slug/editor" params={{ slug }}>
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link to="/p/$slug" params={{ slug }}>
                <ArrowLeftIcon aria-hidden />
                Back to page
              </Link>
            }
          />
        </>
      }
    />
  )
}
