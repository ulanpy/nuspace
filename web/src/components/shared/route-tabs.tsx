import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export interface RouteTab {
  to: LinkProps["to"]
  label: string
  /** Index route needs exact matching or it stays lit on every child. */
  exact?: boolean
}

/**
 * The tab bar for a sectioned area, on `ui/tabs` so it is the same control as
 * every filter row in the app.
 *
 * Tabs are real child routes rather than `useState`, so each section is
 * linkable, back-button-able and separately code-split — `/courses/schedule` and
 * `/courses/audit` are the two heaviest screens in the app, and tab state in one
 * component meant shipping both to every student who only wanted a grade. The
 * `Link` is kept in `render` rather than replaced by a click handler so the href
 * stays real: middle-click, copy link and router prefetch all keep working.
 */
export function RouteTabs({
  label,
  tabs,
  className,
}: {
  label: string
  tabs: readonly RouteTab[]
  className?: string
}) {
  const matchRoute = useMatchRoute()
  const navigate = useNavigate()

  // A click can only produce one of our own `to` values; going through the array
  // keeps the `to` a literal the router can check rather than a bare string.
  const goTo = (next: string) => {
    const tab = tabs.find((candidate) => candidate.to === next)
    if (tab) void navigate({ to: tab.to })
  }

  return (
    <Tabs
      className={cn("-mx-1 overflow-x-auto overflow-y-hidden", className)}
      // `null`, not `undefined`, when no tab matches. base-ui treats an
      // `undefined` value as "uncontrolled" and then selects the first enabled
      // tab for itself, reporting that as a value change — so a route that is
      // not one of the tabs (a stray child of a settings layout) was navigated
      // away to the first tab the moment it mounted. `null` keeps the control
      // controlled and therefore silent.
      value={
        tabs.find(({ to, exact }) => matchRoute({ to, fuzzy: !exact }))?.to ??
        null
      }
      onValueChange={goTo}
    >
      <TabsList aria-label={label}>
        {tabs.map(({ to, label: tabLabel }) => (
          <TabsTrigger
            key={to}
            value={to}
            nativeButton={false}
            render={<Link to={to}>{tabLabel}</Link>}
          />
        ))}
      </TabsList>
    </Tabs>
  )
}
