import { useEffect, useState } from "react"
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

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

  useEffect(() => {
    writeSidebarCollapsed(window.localStorage, sidebarCollapsed)
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main
        className={cn(
          "transition-[padding-left] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)]",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64"
        )}
      >
        <PageContainer className="py-4 sm:py-6">
          <Outlet />
        </PageContainer>
      </main>
    </div>
  )
}
