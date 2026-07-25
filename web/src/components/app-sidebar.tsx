import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  InfoIcon,
  MenuIcon,
  MegaphoneIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface NavItem {
  /**
   * Typed against the generated route tree, so a link to a route that does not
   * exist fails the build. The old app's Link wrapper took a plain string and
   * threw this away.
   */
  to: LinkProps["to"]
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { to: "/announcements", label: "Home", icon: MegaphoneIcon },
  { to: "/events", label: "Events", icon: CalendarIcon },
  { to: "/communities", label: "Communities", icon: UsersIcon },
  { to: "/courses", label: "Courses", icon: BookOpenIcon },
  { to: "/opportunities", label: "Opportunities", icon: BriefcaseIcon },
  { to: "/contacts", label: "Contacts", icon: InfoIcon },
  { to: "/sgotinish", label: "SG otinish", icon: ShieldIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        // Mark the section active for nested routes too (/events/123).
        const isActive = pathname === to || pathname.startsWith(`${to}/`)

        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBrand() {
  return (
    <Link
      to="/announcements"
      className="rounded-md px-3 py-2 text-lg font-semibold tracking-tight focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      Nuspace
    </Link>
  )
}

/**
 * App navigation: a fixed rail on desktop, a sheet on mobile.
 *
 * The old sidebar injected a raw <style> block at runtime to compute the main
 * content offset; here the offset is a plain Tailwind class on the layout.
 */
export function AppSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar md:fixed md:inset-y-0 md:left-0 md:flex md:flex-col md:gap-4 md:p-3">
        <SidebarBrand />
        <NavLinks />
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-2 safe-area-inset-top md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <MenuIcon className="size-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-64 p-3">
            <SheetTitle className="px-3 py-2 text-lg font-semibold tracking-tight">
              Nuspace
            </SheetTitle>
            <NavLinks
              onNavigate={() => {
                setOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>
        <SidebarBrand />
      </header>
    </>
  )
}
