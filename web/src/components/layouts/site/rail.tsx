import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"

import logoUrl from "@/assets/nuspace_logo.svg"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { RailSection } from "./types"

const ROW_CLASS =
  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-(--duration-fast) hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"

function RailRow({
  section,
  onNavigate,
}: {
  section: RailSection
  onNavigate?: () => void
}) {
  const { label, icon: Icon, trailing: Trailing, badge: Badge } = section
  const content = (
    <>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      {Badge ? (
        <span className="ml-auto">
          <Badge />
        </span>
      ) : null}
      {Trailing ? (
        <Trailing
          className="ml-auto size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </>
  )

  if (section.href !== undefined) {
    return (
      <a href={section.href} onClick={onNavigate} className={ROW_CLASS}>
        {content}
      </a>
    )
  }

  return (
    <Link
      to={section.to}
      activeOptions={{ exact: section.exact ?? false }}
      onClick={onNavigate}
      className={ROW_CLASS}
    >
      {content}
    </Link>
  )
}

function RailNav({
  sections,
  onNavigate,
}: {
  sections: readonly RailSection[]
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Sections">
      {sections.map((section) => (
        <RailRow
          key={section.label}
          section={section}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  )
}

/**
 * The host's sections beside the content, from `md` up.
 *
 * In flow rather than fixed, so the footer runs under it and nothing has to
 * offset `<main>`. Sticky and `self-start`, so it is only as tall as its rows
 * and parks under the header (14 units) as the page scrolls.
 */
export function Rail({ sections }: { sections: readonly RailSection[] }) {
  return (
    <aside className="sticky top-14 hidden max-h-[calc(100svh-3.5rem)] w-64 shrink-0 self-start overflow-y-auto bg-sidebar p-2 md:block">
      <RailNav sections={sections} />
    </aside>
  )
}

/**
 * The same sections as a sheet from the header's burger, below `md` where
 * there is no room for the rail. Choosing a section closes it.
 *
 * It carries the mark, which the rail does not: without a band at the top the
 * sheet's close button lands on the first row.
 */
export function RailSheet({ sections }: { sections: readonly RailSection[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open sections"
          >
            <MenuIcon className="size-5" aria-hidden />
          </Button>
        }
      />
      <SheetContent
        side="left"
        className="flex w-64 flex-col gap-0 bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Sections</SheetTitle>
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <img src={logoUrl} alt="" aria-hidden className="size-6" />
          <span className="text-lg font-semibold tracking-tight">Nuspace</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <RailNav
            sections={sections}
            onNavigate={() => {
              setOpen(false)
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
