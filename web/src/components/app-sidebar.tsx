import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
        // Keep the section highlighted on nested routes too (/events/123).
        const isActive = pathname === to || pathname.startsWith(`${to}/`)

        const link = (
          <Link
            to={to}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            aria-label={collapsed ? label : undefined}
            className={cn(
              "relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color] duration-[var(--duration-fast)]",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className={cn("truncate", collapsed && "sr-only")}>
              {label}
            </span>
            {isActive && collapsed && (
              <span
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
                aria-hidden
              />
            )}
          </Link>
        )

        return collapsed ? (
          <Tooltip key={to}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        ) : (
          <div key={to}>{link}</div>
        )
      })}
    </nav>
  )
}

function Brand({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isActive = pathname === "/announcements"
  const brand = (
    <Link
      to="/announcements"
      onClick={onNavigate}
      aria-label="Nuspace home"
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-1"
      )}
    >
      <img src={logoUrl} alt="" aria-hidden className="size-7" />
      <span
        className={cn(
          "text-lg font-semibold tracking-tight",
          collapsed && "sr-only"
        )}
      >
        Nuspace
      </span>
    </Link>
  )

  if (!collapsed) return brand

  return (
    <Tooltip>
      <TooltipTrigger render={brand} />
      <TooltipContent side="right">Announcements</TooltipContent>
    </Tooltip>
  )
}

function AccountCard({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const user = useCurrentUser()
  const logout = useLogout()
  const initial = user.given_name.charAt(0).toUpperCase()

  const profileLink = (
    <Link
      to="/profile"
      onClick={onNavigate}
      aria-label={collapsed ? `Profile for ${user.name}` : undefined}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        collapsed && "justify-center px-1"
      )}
    >
      <Avatar size="lg">
        {user.picture && <AvatarImage src={user.picture} alt="" />}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <span className={cn("min-w-0", collapsed && "sr-only")}>
        <span className="block truncate text-sm font-medium">{user.name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </span>
    </Link>
  )

  const logoutButton = (
    <Button
      variant="ghost"
      size={collapsed ? "icon" : "default"}
      disabled={logout.isPending}
      aria-label={
        collapsed ? (logout.isPending ? "Logging out" : "Log out") : undefined
      }
      onClick={() => {
        logout.mutate()
      }}
      className={cn(
        "text-sidebar-foreground",
        collapsed ? "mx-auto" : "w-full justify-start gap-3 px-3"
      )}
    >
      <LogOutIcon className="size-5 shrink-0" aria-hidden />
      {!collapsed && (logout.isPending ? "Logging out…" : "Log out")}
    </Button>
  )

  return (
    <div className="space-y-1 border-t border-sidebar-border pt-3">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={profileLink} />
          <TooltipContent side="right">{user.name}</TooltipContent>
        </Tooltip>
      ) : (
        profileLink
      )}
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={logoutButton} />
          <TooltipContent side="right">
            {logout.isPending ? "Logging out…" : "Log out"}
          </TooltipContent>
        </Tooltip>
      ) : (
        logoutButton
      )}
    </div>
  )
}

/**
 * App navigation: a fixed rail on desktop, a sheet on mobile.
 *
 * The old sidebar injected a raw <style> block at runtime to compute the main
 * content offset; here the offset is a plain Tailwind class on the layout.
 */
export function AppSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const close = () => {
    setOpen(false)
  }

  return (
    <TooltipProvider>
      {/* Desktop */}
      <aside
        id="desktop-navigation"
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-[var(--duration-panel)] ease-[var(--ease-campus-snap)] md:fixed md:inset-y-0 md:left-0 md:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border px-3",
            collapsed ? "flex-col justify-center gap-1 py-2" : "justify-between"
          )}
        >
          <Brand collapsed={collapsed} />
          {!collapsed && <ThemeToggle />}
        </div>
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-2">
          <NavLinks collapsed={collapsed} />
        </div>
        {collapsed && (
          <div className="mx-auto pb-1">
            <Tooltip>
              <TooltipTrigger render={<ThemeToggle />} />
              <TooltipContent side="right">Change theme</TooltipContent>
            </Tooltip>
          </div>
        )}
        <div className="p-2">
          <AccountCard collapsed={collapsed} />
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                aria-controls="desktop-navigation"
                onClick={() => {
                  onCollapsedChange(!collapsed)
                }}
                className="absolute top-1/2 -right-3 z-10 grid h-11 w-7 -translate-y-1/2 place-items-center rounded-full border border-sidebar-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {collapsed ? (
                  <ChevronRightIcon className="size-4" aria-hidden />
                ) : (
                  <ChevronLeftIcon className="size-4" aria-hidden />
                )}
              </button>
            }
          />
          <TooltipContent side="right">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </TooltipContent>
        </Tooltip>
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
    </TooltipProvider>
  )
}
