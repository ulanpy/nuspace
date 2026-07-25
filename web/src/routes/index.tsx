import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { beginLogin, sessionQueryOptions } from "@/features/auth/api"
import { Button } from "@/components/ui/button"

/**
 * Search params are parsed, not read as raw strings. `returnTo` is set by the
 * _app guard when it bounces an anonymous visitor, so signing in returns them
 * to the page they actually asked for.
 */
const landingSearchSchema = z.object({
  returnTo: z.string().optional(),
})

export const Route = createFileRoute("/")({
  validateSearch: landingSearchSchema,
  beforeLoad: async ({ context }) => {
    const session =
      await context.queryClient.ensureQueryData(sessionQueryOptions)
    if (session) {
      throw redirect({ to: "/announcements" })
    }
  },
  component: Landing,
})

function Landing() {
  const { returnTo } = Route.useSearch()

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Nuspace</h1>
          <p className="text-balance text-muted-foreground">
            Campus services, announcements, and student essentials for NU, in
            one place.
          </p>
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            beginLogin(returnTo ?? window.location.origin)
          }}
        >
          Sign in with your NU account
        </Button>
      </div>
    </main>
  )
}
