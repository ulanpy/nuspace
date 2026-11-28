import { Link } from "@tanstack/react-router"
import type { ComponentType } from "react"

import logoUrl from "@/assets/nuspace_logo.svg"
import { ThemeToggle } from "@/components/shared/theme/toggle"
import { AccountControl } from "./account-menu"
import { Launcher } from "./launcher"
import { RailSheet } from "./rail"
import type { RailSection } from "./types"

/**
 * The bar every host opens with, the same on every route: the mark, the
 * search field on a screen that has one, and on the right the theme, the
 * launcher and the account. A screen's own actions belong in the screen.
 *
 * Below `md` a host with sections gets a burger in front of the mark, which
 * opens them as a sheet; from `md` up the rail is simply there.
 */
export function SiteHeader({
  sections,
  search: Search,
}: {
  sections?: readonly RailSection[]
  search?: ComponentType
}) {
  return (
    <header className="sticky top-0 z-30 bg-background">
      <div className="flex h-14 items-center gap-1 pr-3 pl-2 sm:pl-3">
        {sections ? <RailSheet sections={sections} /> : null}

        <Link
          to="/"
          aria-label="Nuspace"
          className="flex shrink-0 items-center gap-2 rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:w-44"
        >
          <img src={logoUrl} alt="" aria-hidden className="size-6" />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            Nuspace
          </span>
        </Link>

        {Search ? (
          <div className="ml-2 flex max-w-2xl min-w-0 flex-1 items-center xl:ml-0">
            <Search />
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <Launcher />
          <AccountControl />
        </div>
      </div>
    </header>
  )
}
