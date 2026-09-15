import { createFileRoute } from "@tanstack/react-router"

import { AppLayout } from "@/components/layouts/app"
import { sessionQueryOptions } from "@/lib/user"

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions)
    // Browsing campus information is public. Mutating controls still enforce
    // authentication through their own UI and the backend policy.
    return { session }
  },
  component: AppLayout,
})
