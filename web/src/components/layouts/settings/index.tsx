import { Outlet } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { Page } from "@/components/shared/page"
import { RouteTabs, type RouteTab } from "@/components/shared/route-tabs"

interface SettingsShellProps {
  title: string
  description?: string
  /** Omit for a settings area with no subsections. */
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
 * Split from `SettingsLayout` so a settings area that is a single route can
 * reuse the chrome without wrapping itself in an `Outlet` it cannot provide.
 *
 * A settings area must not put a non-tab route under `SettingsLayout`: the tab
 * bar has no value on such a route, and base-ui reports its fallback tab
 * selection as a change, which navigates the reader back to the first tab on
 * mount. The page editor lives beside the settings layout for this reason.
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
