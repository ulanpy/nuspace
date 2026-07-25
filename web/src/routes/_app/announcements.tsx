import { createFileRoute } from "@tanstack/react-router"

import { useCurrentUser } from "@/features/auth/use-session"

export const Route = createFileRoute("/_app/announcements")({
  component: Announcements,
})

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function Announcements() {
  const user = useCurrentUser()

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}, {user.given_name}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at Nuspace
        </p>
      </header>
    </div>
  )
}
