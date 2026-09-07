import { createFileRoute, redirect } from "@tanstack/react-router"

import { AppLayout } from "@/components/layouts/app"
import { sessionQueryOptions } from "@/lib/user"

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
