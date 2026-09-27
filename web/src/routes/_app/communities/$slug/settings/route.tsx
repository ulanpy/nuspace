import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, PaletteIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { SettingsLayout } from "@/components/layouts/settings"
import { communityDetailQueryOptions } from "@/lib/communities"

export const Route = createFileRoute("/_app/communities/$slug/settings")({
  loader: async ({ context, params }) => {
    let community
    try {
      community = await context.queryClient.ensureQueryData(
        communityDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }

    // Anyone who can edit may hold settings, which includes a community admin
    // and not just the owner. Everyone else has no business on either tab.
    if (!community.permissions.can_edit) {
      throw redirect({
        to: "/communities/$slug",
        params: { slug: params.slug },
      })
    }

    return { community }
  },
  component: CommunitySettingsLayoutRoute,
})

function CommunitySettingsLayoutRoute() {
  const { slug } = Route.useParams()

  return (
    <SettingsLayout
      title="Settings"
      sections={[
        {
          to: "/communities/$slug/settings/general",
          label: "General",
        },
        {
          to: "/communities/$slug/settings/admin-controls",
          label: "Admin controls",
        },
      ]}
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link to="/communities/$slug/editor" params={{ slug }}>
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link to="/communities/$slug" params={{ slug }}>
                <ArrowLeftIcon aria-hidden />
                Back to community
              </Link>
            }
          />
        </>
      }
    />
  )
}
