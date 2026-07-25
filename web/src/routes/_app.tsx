import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { sessionQueryOptions } from "@/features/auth/api"

/**
 * Authenticated shell. Every route beneath it is guarded here, once — the old
 * app named a component ProtectedLayout but performed no auth check in it,
 * leaving each page to call useUser() and handle redirects itself.
 */
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

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container px-3 py-4 sm:px-4 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
