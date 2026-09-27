import { Link, useMatchRoute } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"

import { cn } from "@/lib/utils"

export interface TabsNavTab {
  to: LinkProps["to"]
  label: string
  /** Index route needs exact matching or it stays lit on every child. */
  exact?: boolean
}

/**
 * The pill tab bar for a sectioned area.
 *
 * Tabs are real child routes rather than `useState`, so each section is
 * linkable, back-button-able and separately code-split. `layouts/courses` and
 * `layouts/settings` each grew their own copy of this markup; they differed
 * only in the active-state comparison, which is what `exact` is for.
 */
export function TabsNav({
  label,
  tabs,
  className,
}: {
  label: string
  tabs: readonly TabsNavTab[]
  className?: string
}) {
  const matchRoute = useMatchRoute()

  return (
    <nav
      aria-label={label}
      className={cn(
        "-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1",
        className
      )}
    >
      {tabs.map(({ to, label: tabLabel, exact }) => {
        const isActive = Boolean(matchRoute({ to, fuzzy: !exact }))

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
            {tabLabel}
          </Link>
        )
      })}
    </nav>
  )
}
