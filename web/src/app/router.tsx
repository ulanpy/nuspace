import { createRouter } from "@tanstack/react-router"

import { routeTree } from "@/routeTree.gen"
import { queryClient } from "@/app/query-client"
import { NotFound } from "@/components/shared/not-found"
import { createHostRewrite } from "@/lib/hosts"

export const router = createRouter({
  routeTree,
  context: { queryClient },
  // Six hosts, one route tree: `events.nuspace.kz/42` is `/events/42` here,
  // and a link to another host's route leaves for that host.
  rewrite: createHostRewrite(),
  defaultPreload: "intent",
  // Query owns caching; the router should not keep a second copy.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultNotFoundComponent: () => <NotFound />,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
