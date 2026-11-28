// The sidebar the app ships today, pulled in whole so the account host is judged
// against what exists rather than against an idea of it.
//
// Copied from `web/src/components/layouts/app/app-sidebar.tsx`, minus three
// things: the top strip and the account card, which went into the site header
// and the avatar menu, and the collapse, which had nowhere to be but a bar that
// is already busy.
//
// Two mechanical changes: the rail is in flow, not `md:fixed` with `md:pl-64` on
// `<main>`, because a fixed rail positions against the viewport and would escape
// the frame the workbench judges a screen in; and there are no borders on it,
// because a rule down the edge of a background that already differs from the
// page's is a line nobody asked for.
//
// ponytail: no `Link`, no router. `href` is whatever the caller has, which for a
// prototype is `?c=entry` and for the real thing is a route path.

import { useState } from "react"
import type { ReactElement } from "react"
import type { LucideIcon } from "lucide-react"

import logoUrl from "@/assets/nuspace_logo.svg"
import {
  BookOpenIcon,
  CalendarIcon,
  GlobeIcon,
  InfoIcon,
  MenuIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export type RailItem = {
  id: string
  label: string
  icon: LucideIcon
  href: string
  badge?: number
  /** Sits hard right, for a row that leaves whatever it is inside. */
  trailing?: LucideIcon
}

export function RailNav({
  items,
  activeId,
}: {
  items: RailItem[]
  activeId: string | null
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Sections">
      {items.map(
        ({ id, label, icon: Icon, href, badge, trailing: Trailing }) => {
          const isActive = id === activeId

          return (
            <a
              key={id}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color] duration-(--duration-fast)",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="truncate">{label}</span>
              {badge ? (
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                  {badge}
                </span>
              ) : null}
              {Trailing ? (
                <Trailing
                  className="ml-auto size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              ) : null}
            </a>
          )
        }
      )}
    </nav>
  )
}

/**
 * The rail. It is in flow, so a caller puts it in a flex row; the app instead
 * offsets `<main>` and leaves this `md:fixed`. Nothing above it: the mark is in
 * the site header.
 *
 * Sticky, though, and `self-start` so it is only as tall as its own content —
 * a rail that stretched to the height of the page would have nothing to stick
 * against. It parks under the site header, which is 14 units tall and sticks
 * to the top of the same scrollport.
 */
export function SidebarRail({
  items,
  activeId,
}: {
  items: RailItem[]
  activeId: string | null
}) {
  return (
    <aside className="sticky top-14 hidden w-64 shrink-0 flex-col self-start overflow-hidden bg-sidebar md:flex">
      <div className="flex-1 overflow-x-hidden overflow-y-auto p-2">
        <RailNav items={items} activeId={activeId} />
      </div>
    </aside>
  )
}

/**
 * The same rail as a sheet, for widths where there is no room for it.
 *
 * It keeps the mark, which the desktop rail no longer has, and it is what stops
 * the sheet's own close button from landing on the first row: without a band to
 * sit over, the × closed a menu whose top entry you cannot read.
 */
export function SidebarSheet({
  items,
  activeId,
  trigger,
}: {
  items: RailItem[]
  activeId: string | null
  trigger?: ReactElement
}) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          trigger ?? (
            <Button variant="ghost" size="icon-sm" aria-label="Open sections">
              <MenuIcon aria-hidden />
            </Button>
          )
        }
      />
      <SheetContent
        side="left"
        className="flex w-64 flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Sections</SheetTitle>

        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <img src={logoUrl} alt="" aria-hidden className="size-6" />
          <span className="text-lg font-semibold tracking-tight">Nuspace</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <RailNav items={items} activeId={activeId} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The app's own nav, for the preview below. */
const APP_NAV: RailItem[] = [
  { id: "mynuspace", label: "My Nuspace", icon: GlobeIcon, href: "?c=people" },
  { id: "events", label: "Events", icon: CalendarIcon, href: "?c=events" },
  { id: "courses", label: "Courses", icon: BookOpenIcon, href: "?c=courses" },
  { id: "contacts", label: "Contacts", icon: InfoIcon, href: "#" },
]

export default function AppSidebarPreview() {
  return (
    <div className="flex h-full min-h-svh gap-6 bg-background p-6">
      <SidebarRail items={APP_NAV} activeId="events" />

      <div className="max-w-2xl text-sm text-muted-foreground">
        <p>
          The rail as the app ships it. The top strip, the account card and the
          collapse all went into the site header, so what is left is sections
          and nothing else. No borders either. See{" "}
          <code>account-layout.wb</code> for the account host&apos;s own, which
          is a flat list with the row that leaves the host at the bottom.
        </p>
      </div>
    </div>
  )
}
