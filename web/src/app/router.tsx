import { createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"
import { queryClient } from "@/app/query-client"
import { NotFound } from "@/components/not-found"

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  // Query owns caching; the router should not keep a second copy.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: NotFound,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
