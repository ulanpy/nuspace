import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, PaletteIcon } from "lucide-react"

import type { PageSettingsSearch } from "@/routes/_app/pages/$slug/settings"
import type { Page as PageEntity } from "@/lib/pages"
import { PAGE_SETTINGS_TABS } from "@/lib/pages/constants"
import { Page } from "@/components/shared/page"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminControls } from "@/components/routes/pages/settings/admin-controls"
import { GeneralSettings } from "@/components/routes/pages/settings/general"

const TAB_LABELS: Record<(typeof PAGE_SETTINGS_TABS)[number], string> = {
  general: "General",
  "admin-controls": "Admin controls",
}

/**
 * A Page's settings, at `pages.nuspace.kz/<slug>/settings`: its details and
 * visibility under General, its admins under Admin controls.
 *
 * The sections are a `?tab=` on the one route, not child routes, because the
 * host serves `/<slug>/settings` and nothing below it. Each tab is still a
 * real link, so a section can be shared and Back walks out of it.
 */
export function PageSettingsScreen({
  page,
  search,
  onSearchChange,
}: {
  page: PageEntity
  search: PageSettingsSearch
  onSearchChange: (
    updater: (previous: PageSettingsSearch) => PageSettingsSearch
  ) => void
}) {
  const { slug } = page

  return (
    <Page
      title="Settings"
      width="prose"
      actions={
        <>
          <Button
            nativeButton={false}
            render={
              <Link to="/pages/$slug/edit" params={{ slug }}>
                <PaletteIcon aria-hidden />
                Design page
              </Link>
            }
          />
          <Button
            nativeButton={false}
            variant="outline"
            render={
              <Link to="/pages/$slug" params={{ slug }}>
                <ArrowLeftIcon aria-hidden />
                Back to page
              </Link>
            }
          />
        </>
      }
    >
      <Tabs
        className="-mx-1 overflow-x-auto overflow-y-hidden"
        value={search.tab}
      >
        <TabsList aria-label="Settings sections">
          {PAGE_SETTINGS_TABS.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              nativeButton={false}
              render={
                <Link
                  to="/pages/$slug/settings"
                  params={{ slug }}
                  search={{ tab }}
                >
                  {TAB_LABELS[tab]}
                </Link>
              }
            />
          ))}
        </TabsList>
      </Tabs>

      {search.tab === "general" ? (
        <GeneralSettings page={page} />
      ) : (
        <AdminControls
          page={page}
          search={search}
          onSearchChange={onSearchChange}
        />
      )}
    </Page>
  )
}
