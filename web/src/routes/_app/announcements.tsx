import { createFileRoute } from "@tanstack/react-router"

import { useCurrentUser } from "@/features/auth/use-session"
import { beginLogout } from "@/features/auth/api"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/announcements")({
  component: Announcements,
})

function Announcements() {
  const user = useCurrentUser()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hi, {user.given_name}
        </h1>
        <Button variant="outline" onClick={beginLogout}>
          Sign out
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Signed in as {user.email} ({user.role}).
      </p>
    </div>
  )
}
