import { createRootRouteWithContext } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

import { SiteLayout } from "@/components/layouts/site"

/**
 * The router carries the QueryClient so route `beforeLoad`/`loader` hooks and
 * components resolve the same cache. The old app had two separate QueryClient
 * instances and invalidations silently hit the one nothing rendered.
 */
export interface RouterContext {
  queryClient: QueryClient
}

/**
 * Every host renders inside one shell: the same header and footer, and the
 * host's rail when a route gives it sections (`staticData.shell`).
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: SiteLayout,
})
