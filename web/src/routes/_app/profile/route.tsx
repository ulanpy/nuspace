import { createFileRoute, redirect } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { LogOutIcon, PaletteIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { SettingsLayout } from "@/components/layouts/settings"
import { useLogout } from "@/hooks/use-logout"

export const Route = createFileRoute("/_app/profile")({
  // `_app` leaves browsing public, so this route guards itself. The parent
  // `beforeLoad` has already resolved the session into context.
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({ to: "/" })
    }
  },
  component: ProfileSettingsLayoutRoute,
})

function ProfileSettingsLayoutRoute() {
  const logout = useLogout()

  return (
    <SettingsLayout
      title="Profile"
      description="Manage your campus identity and page."
      sections={[
        { to: "/profile/general", label: "General" },
        { to: "/profile/communities", label: "My communities" },
      ]}
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link to="/profile/editor">
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            variant="outline"
            size="sm"
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
