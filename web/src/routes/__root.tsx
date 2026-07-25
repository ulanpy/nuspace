import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

/**
 * The router carries the QueryClient so route `beforeLoad`/`loader` hooks and
 * components resolve the same cache. The old app had two separate QueryClient
 * instances and invalidations silently hit the one nothing rendered.
 */
export interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
})

function RootComponent() {
  return <Outlet />
}
