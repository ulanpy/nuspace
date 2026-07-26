import {
  Link,
  Outlet,
  createFileRoute,
  useMatchRoute,
} from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import { MessagesSquareIcon } from "lucide-react"

import { usePermissions } from "@/features/auth/use-session"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
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
      ? [
          { to: "/sgotinish/sg" as const, label: "SG inbox" },
          { to: "/sgotinish/members" as const, label: "Members" },
        ]
      : []),
  ]

  return (
    <PageContainer maxWidth="default" padding="none" className="space-y-6">
      <PageHeader
        eyebrow="Student Government"
        title="SG otinish"
        description="Raise something with Student Government, anonymously if you prefer."
        actions={
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            <MessagesSquareIcon className="size-5" />
          </span>
        }
      />

      {tabs.length > 1 && (
        <nav
          aria-label="SGotinish sections"
          className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-xs"
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
    </PageContainer>
  )
}
