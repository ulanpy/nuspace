import { Outlet } from "@tanstack/react-router"
import type { ReactNode } from "react"

import { PageHeader } from "@/components/shared/page/header"
import { TabsNav, type TabsNavTab } from "@/components/shared/tabs-nav"

interface SettingsLayoutProps {
  title: string
  description?: string
  /** Omit for a settings area with no subsections, e.g. `/profile`. */
  sections?: readonly TabsNavTab[]
  actions?: ReactNode
}

/**
 * Shell for a settings area: a header, an optional tab bar, and the active
 * child.
 *
 * The header is `PageHeader` so settings screens match every other page, and
 * the tabs are `TabsNav`, which `layouts/courses` shares. `sections` is a prop
 * rather than a constant so a tabless area reuses the shell without inheriting
 * tabs it has no business showing.
 */
export function SettingsLayout({
  title,
  description,
  sections,
  actions,
}: SettingsLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} actions={actions} />

      {sections ? (
        <TabsNav label={`${title} sections`} tabs={sections} />
      ) : null}

      <Outlet />
    </div>
  )
}
