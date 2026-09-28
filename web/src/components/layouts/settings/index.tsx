import { Outlet } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Page } from "@/components/shared/page"
import { RouteTabs, type RouteTab } from "@/components/shared/route-tabs"

interface SettingsShellProps {
  title: string
  description?: string
  /** Omit for a settings area with no subsections, e.g. `/profile`. */
  sections?: readonly RouteTab[]
  actions?: ReactNode
}

/**
 * The page chrome for a settings area: a header, an optional tab bar, and its
 * content.
 *
 * The header is `PageHeader` so settings screens match every other page, and
 * the tabs are `RouteTabs`, which `layouts/courses` shares. `sections` is a prop
 * rather than a constant so a tabless area reuses the shell without inheriting
 * tabs it has no business showing.
 *
 * Split from `SettingsLayout` so a settings area that is a single route — the
 * profile is a leaf with no child routes — can reuse the chrome without
 * wrapping itself in an `Outlet` it cannot provide.
 */
export function SettingsShell({
  title,
  description,
  sections,
  actions,
  children,
}: SettingsShellProps & { children: ReactNode }) {
  return (
    <Page
      title={title}
      description={description}
      actions={actions}
      width="prose"
    >
      {sections ? (
        <RouteTabs label={`${title} sections`} tabs={sections} />
      ) : null}

      {children}
    </Page>
  )
}

/** `SettingsShell` for an area whose sections are child routes. */
export function SettingsLayout(props: SettingsShellProps) {
  return (
    <SettingsShell {...props}>
      <Outlet />
    </SettingsShell>
  )
}
