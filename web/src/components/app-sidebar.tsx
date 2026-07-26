import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  InfoIcon,
  LogOutIcon,
  MenuIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import logoUrl from "@/assets/nuspace_logo.svg"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/features/auth/use-session"
import { useLogout } from "@/features/auth/use-logout"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
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

// Home is the logo and profile is the account card, matching the previous app.
const NAV_ITEMS: NavItem[] = [
  { to: "/events", label: "Events", icon: CalendarIcon },
  { to: "/courses", label: "Courses", icon: BookOpenIcon },
  { to: "/communities", label: "Communities", icon: UsersIcon },
  { to: "/opportunities", label: "Opportunities Digest", icon: BriefcaseIcon },
  { to: "/contacts", label: "Contacts", icon: InfoIcon },
  { to: "/sgotinish", label: "SG otinish", icon: ShieldIcon },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        // Keep the section highlighted on nested routes too (/events/123).
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

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/announcements"
      onClick={onNavigate}
      aria-label="Nuspace home"
      className="flex items-center gap-2 rounded-md px-2 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <img src={logoUrl} alt="" aria-hidden className="size-7" />
      <span className="text-lg font-semibold tracking-tight">Nuspace</span>
    </Link>
  )
}

function AccountCard({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser()
  const logout = useLogout()
  const initial = user.given_name.charAt(0).toUpperCase()

  return (
    <div className="space-y-1 border-t border-sidebar-border pt-3">
      <Link
        to="/profile"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sm font-medium text-sidebar-accent-foreground"
        >
          {initial}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {user.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </span>
      </Link>

      <Button
        variant="ghost"
        disabled={logout.isPending}
        onClick={() => {
          logout.mutate()
        }}
        className="w-full justify-start gap-3 px-3 text-sidebar-foreground"
      >
        <LogOutIcon className="size-5 shrink-0" aria-hidden />
        {logout.isPending ? "Logging out…" : "Log out"}
      </Button>
    </div>
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
  const close = () => {
    setOpen(false)
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-3 md:fixed md:inset-y-0 md:left-0 md:flex">
        <div className="flex items-center justify-between">
          <Brand />
          <ThemeToggle />
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <AccountCard />
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
          <SheetContent side="left" className="flex w-64 flex-col p-3">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand onNavigate={close} />
            <div className="mt-4 flex-1 overflow-y-auto">
              <NavLinks onNavigate={close} />
            </div>
            <AccountCard onNavigate={close} />
          </SheetContent>
        </Sheet>
        <Brand />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
    </>
  )
}
