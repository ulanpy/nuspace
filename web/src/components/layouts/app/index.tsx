import { useEffect, useState } from "react"
import { Outlet, useMatchRoute } from "@tanstack/react-router"

import { readSidebarCollapsed, writeSidebarCollapsed } from "@/lib/shell"
import { AppSidebar } from "@/components/layouts/app/app-sidebar"
import { cn } from "@/lib/utils"

/**
 * Shared workspace shell. Campus information can be browsed anonymously;
 * account-specific controls still request sign-in when they are used.
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
          "transition-[padding-left] duration-(--duration-panel) ease-(--ease-campus-snap)",
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
          // The only place horizontal padding lives. Pages used to set their
          // own on top of this one and land up padded twice; now they cannot.
          <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  )
}
