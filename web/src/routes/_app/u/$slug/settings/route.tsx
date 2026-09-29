import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, LogOutIcon, PaletteIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { ApiError } from "@/api/client"
import { SettingsLayout } from "@/components/layouts/settings"
import { userPageQueryOptions } from "@/lib/user"
import { useLogout } from "@/hooks/use-logout"

/**
 * Settings for the page at `/u/$slug`, which is yours or 404s — the same rule
 * the public page itself follows, so a private profile is not something a
 * stranger can discover by walking one segment to the right.
 *
 * It is a sibling of the editor, not its parent. A child of this layout
 * inherits its tab bar, and a tab bar with no matching tab navigates: base-ui
 * selects the first tab on mount and reports it as a change, which is why the
 * editor used to flash and land back on General.
 */
export const Route = createFileRoute("/_app/u/$slug/settings")({
  loader: async ({ context, params }) => {
    const session = context.session
    if (!session) {
      // The landing page's sign-in button returns to the current path, so
      // bouncing through it lands back here after the round trip to Keycloak.
      throw redirect({ to: "/" })
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
  component: UserSettingsLayoutRoute,
})

function UserSettingsLayoutRoute() {
  const { slug } = Route.useParams()
  const logout = useLogout()

  return (
    <SettingsLayout
      title="Settings"
      description="Manage your campus identity and page."
      sections={[
        { to: "/u/$slug/settings/general", label: "General" },
        { to: "/u/$slug/settings/communities", label: "My communities" },
      ]}
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link to="/u/$slug/editor" params={{ slug }}>
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link to="/u/$slug" params={{ slug }}>
                <ArrowLeftIcon aria-hidden />
                Back to page
              </Link>
            }
          />
          <Button
            variant="outline"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate()
            }}
          >
            <LogOutIcon className="size-4" aria-hidden />
            {logout.isPending ? "Logging out…" : "Log out"}
          </Button>
        </>
      }
    />
  )
}
