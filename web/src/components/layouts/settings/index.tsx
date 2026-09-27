import { Link, Outlet, useMatchRoute } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface SettingsSectionTab {
  to: LinkProps["to"]
  label: string
  /** Index route needs exact matching or it stays lit on every child. */
  exact?: boolean
}

interface SettingsLayoutProps {
  title: string
  description?: string
  sections: SettingsSectionTab[]
  actions?: ReactNode
}

/**
 * Shell for a settings area: a header, a tab bar, and the active child.
 *
 * The tabs are real child routes rather than `useState`, so each section is
 * linkable, back-button-able and separately code-split — same reasoning as
 * `layouts/courses`. `sections` is a prop instead of a constant so the next
 * settings area (profile) reuses the shell without inheriting this one's tabs.
 */
export function SettingsLayout({
  title,
  description,
  sections,
  actions,
}: SettingsLayoutProps) {
  const matchRoute = useMatchRoute()

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </header>

      <nav
        aria-label={`${title} sections`}
        className="-mx-1 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {sections.map(({ to, label, exact }) => {
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
              {label}
            </Link>
          )
        })}
      </nav>

      <Outlet />
    </div>
  )
}
