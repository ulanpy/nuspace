import { createFileRoute } from "@tanstack/react-router"

import { sessionQueryOptions } from "@/lib/user"

/** The service screens. The shell is the root route's, shared by every host. */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions)
    // Browsing campus information is public. Mutating controls still enforce
    // authentication through their own UI and the backend policy.
    return { session }
  },
})
