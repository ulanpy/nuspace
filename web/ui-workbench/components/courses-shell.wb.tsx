import { useState } from "react"
import type { ReactNode } from "react"
import {
  BookOpenIcon,
  CalendarDaysIcon,
  ChartNoAxesColumnIcon,
  GraduationCapIcon,
  MenuIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import { SidebarRail, SidebarSheet, type RailItem } from "./app-sidebar.wb"
import { SiteHeader } from "./site-header.wb"
import { SignedInToggle } from "./signed-in"

/**
 * The courses host's four sections, in the order the rail shows them.
 *
 * The old page had them as tabs above the content. They are sections of the
 * host now, so they live in the rail, and each one is its own screen.
 */
const COURSE_SECTIONS: RailItem[] = [
  {
    id: "my-courses",
    label: "My Courses",
    icon: BookOpenIcon,
    href: "?c=courses",
  },
  {
    id: "statistics",
    label: "Statistics",
    icon: ChartNoAxesColumnIcon,
    href: "?c=courses-statistics",
  },
  {
    id: "schedule",
    label: "Schedule Builder",
    icon: CalendarDaysIcon,
    href: "?c=courses-schedule",
  },
  {
    id: "audit",
    label: "Degree Audit",
    icon: GraduationCapIcon,
    href: "?c=courses-audit",
  },
]

const ACCOUNT = { name: "Aiza Tursyn", handle: "@aiza" }

/**
 * The shell every screen on this host wears: the shared header, the sections
 * in the rail, and the content beside them.
 */
export function CoursesShell({
  activeId,
  children,
}: {
  activeId: string
  children: ReactNode
}) {
  const [signedIn, setSignedIn] = useState(true)

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader
        rail={
          <SidebarSheet
            items={COURSE_SECTIONS}
            activeId={activeId}
            trigger={
              <Button
                variant="ghost"
                size="icon-sm"
                className="md:hidden"
                aria-label="Open sections"
              >
                <MenuIcon aria-hidden />
              </Button>
            }
          />
        }
        account={signedIn ? ACCOUNT : null}
      />
      <SignedInToggle signedIn={signedIn} onToggle={setSignedIn} />

      <div className="flex min-h-0 flex-1">
        <SidebarRail items={COURSE_SECTIONS} activeId={activeId} />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function CoursesShellPreview() {
  return (
    <CoursesShell activeId="my-courses">
      <p className="max-w-prose text-sm text-muted-foreground">
        The shell every screen on the courses host wears: the shared header, the
        host&rsquo;s four sections in the rail, and the content beside them.
        Each section is its own route screen, so the rail is the way between
        them.
      </p>
    </CoursesShell>
  )
}
