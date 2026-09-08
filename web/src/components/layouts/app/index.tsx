import { useEffect, useState } from "react"
import { Outlet, useMatchRoute } from "@tanstack/react-router"

import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/shell"
import { AppSidebar } from "@/components/layouts/app/app-sidebar"
import { PageContainer } from "@/components/shared/page/container"
import { cn } from "@/lib/utils"

/**
 * Authenticated shell. Every route beneath it is guarded in the route's
 * beforeLoad (see routes/_app/route.tsx).
 */
export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readSidebarCollapsed(window.localStorage)
  )

  const matchRoute = useMatchRoute()
  // The community page editor fills the whole main area (the Puck canvas is
  // the page itself, not a widget in a container), and the community detail
  // page is designed as a full-width landing page with its own compact header,
  // so both drop the global shell sidebar. The details check is fuzzy=false so
  // sub-routes (`/settings`, `/editor`) are not caught by it.
  const shouldHideSidebar = Boolean(
    matchRoute({ to: "/communities/$slug/editor", fuzzy: true }) ||
    matchRoute({ to: "/communities/$slug" })
  )

  useEffect(() => {
    writeSidebarCollapsed(window.localStorage, sidebarCollapsed)
  }, [sidebarCollapsed])

  return (
    <div className="min-h-screen bg-background">
      {!shouldHideSidebar && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      )}
      <main
        className={cn(
          "transition-[padding-left] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)]",
          shouldHideSidebar
            ? "pl-0"
            : sidebarCollapsed
              ? "md:pl-16"
              : "md:pl-64"
        )}
      >
        {shouldHideSidebar ? (
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
