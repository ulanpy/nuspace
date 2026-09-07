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
  // the page itself, not a widget in a container).
  const isImmersiveEditor = Boolean(
    matchRoute({ to: "/communities/$slug/editor", fuzzy: true })
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
          isImmersiveEditor
            ? "pl-0"
            : sidebarCollapsed
              ? "md:pl-16"
              : "md:pl-64"
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
