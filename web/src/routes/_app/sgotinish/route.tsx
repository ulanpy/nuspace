import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
} from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"

import { usePermissions } from "@/features/auth/use-session"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_app/sgotinish")({
  component: SGotinishLayout,
})

interface Tab {
  to: LinkProps["to"]
  label: string
}

function SGotinishLayout() {
  const { isSgMember, isAdmin } = usePermissions()
  const matchRoute = useMatchRoute()

  // SG staff see the inbox tab; everyone sees their own tickets. The backend
  // enforces this too — this only decides what is worth showing.
  const canSeeInbox = isSgMember || isAdmin

  const tabs: Tab[] = [
    { to: "/sgotinish/student", label: "My tickets" },
    ...(canSeeInbox
      ? [{ to: "/sgotinish/sg" as const, label: "SG inbox" }]
      : []),
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">SG otinish</h1>
        <p className="text-muted-foreground">
          Raise something with Student Government, anonymously if you prefer.
        </p>
      </header>

      {tabs.length > 1 && (
        <nav
          aria-label="SGotinish sections"
          className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
        >
          {tabs.map(({ to, label }) => {
            const isActive = Boolean(matchRoute({ to, fuzzy: true }))

            return (
              <Link
                key={to}
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      )}

      <Outlet />
    </div>
  )
}
