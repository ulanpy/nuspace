import { useEffect, useState } from "react"
import {
  Outlet,
  createFileRoute,
  redirect,
  useMatchRoute,
} from "@tanstack/react-router"

import { sessionQueryOptions } from "@/features/auth/api"
import {
  readSidebarCollapsed,
  writeSidebarCollapsed,
} from "@/features/shell/sidebar-preference"
import { AppSidebar } from "@/components/app-sidebar"
import { PageContainer } from "@/components/page-container"
import { cn } from "@/lib/utils"

/**
 * Authenticated shell. Every route beneath it is guarded here, once — the old
 * app named a component ProtectedLayout but performed no auth check in it,
 * leaving each page to call useUser() and handle redirects itself.
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (!session) {
      throw redirect({ to: "/", search: { returnTo: location.href } })
    }
    // Downstream routes and components read this without re-fetching.
    return { session }
  },
  component: AppLayout,
})

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readSidebarCollapsed(window.localStorage)
  )

  const matchRoute = useMatchRoute()
  // The community page editor fills the whole main area (the Puck canvas is
  // the page itself, not a widget in a container).
  const isImmersiveEditor = Boolean(
    matchRoute({ to: "/communities/$slug/edit-page", fuzzy: true })
  )

  useEffect(() => {
    writeSidebarCollapsed(window.localStorage, sidebarCollapsed)
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-background">
      {!isImmersiveEditor && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      )}
      <main
        className={cn(
          "transition-[padding-left] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)]",
          isImmersiveEditor ? "pl-0" : sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        {isImmersiveEditor ? (
          <Outlet />
        ) : (
          <PageContainer className="py-4 sm:py-6">
            <Outlet />
          </PageContainer>
        )}
      </main>
    </div>
  )
}
