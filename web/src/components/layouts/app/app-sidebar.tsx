import { useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  InfoIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftIcon,
  GlobeIcon,
} from "lucide-react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import logoUrl from "@/assets/nuspace_logo.svg"
import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { useLogout } from "@/hooks/use-logout"
import { beginLogin } from "@/lib/user"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme/toggle"
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

// Home is the logo and the account card at the bottom is the profile, matching
// the previous app.
const NAV_ITEMS: NavItem[] = [
  // First: it is a directory, not a section of the app you are working in, and
  // it was third for no reason other than the order things were added.
  { to: "/mynuspace", label: "My Nuspace", icon: GlobeIcon },
  { to: "/events", label: "Events", icon: CalendarIcon },
  { to: "/courses", label: "Courses", icon: BookOpenIcon },
  { to: "/opportunities", label: "Opportunities Digest", icon: BriefcaseIcon },
  { to: "/contacts", label: "Contacts", icon: InfoIcon },
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
              "relative flex min-h-10 items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-[background-color,color] duration-(--duration-fast)",
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
  onExpand,
}: {
  collapsed?: boolean
  onNavigate?: () => void
  onExpand?: () => void
}) {
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand sidebar"
              className="group flex items-center justify-center rounded-md p-1 transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <img
                src={logoUrl}
                alt=""
                aria-hidden
                className="size-7 group-hover:hidden"
              />
              <PanelLeftIcon
                className="hidden size-7 group-hover:block"
                aria-hidden
              />
            </button>
          }
        />
        <TooltipContent side="right">Expand sidebar</TooltipContent>
      </Tooltip>
    )
  }

  const brand = (
    <Link
      to="/announcements"
      onClick={onNavigate}
      aria-label="Nuspace home"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        "hover:bg-sidebar-accent/60"
      )}
    >
      <img src={logoUrl} alt="" aria-hidden className="size-7" />
      <span className="text-lg font-semibold tracking-tight">Nuspace</span>
    </Link>
  )

  return brand
}

function AccountCard({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const session = useSession()
  const logout = useLogout()
  if (!session) {
    return (
      <div className="border-t border-sidebar-border pt-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          aria-label={collapsed ? "Sign in" : undefined}
          onClick={() => {
            beginLogin()
          }}
          className={cn(
            "text-sidebar-foreground",
            // `flex` is load-bearing: `Button` is `inline-flex`, and auto margins
            // are inert on an inline-level box, so `mx-auto` alone left this pinned
            // to the left of the collapsed rail.
            collapsed ? "mx-auto flex" : "w-full justify-start gap-3 px-3"
          )}
        >
          <LogInIcon className="size-5 shrink-0" aria-hidden />
          {!collapsed && "Sign in"}
        </Button>
      </div>
    )
  }

  const user = session.user
  const initial = user.given_name.charAt(0).toUpperCase()

  // The account card opens `/account`, which is where the Telegram connection
  // and the pages you manage live. It used to point at `/u/$slug/settings`,
  // which meant knowing your own handle.
  const profileLink = (
    <Link
      to="/account"
      onClick={onNavigate}
      aria-label={collapsed ? `Account for ${user.name}` : undefined}
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
        // `flex` is load-bearing: `Button` is `inline-flex`, and auto margins
        // are inert on an inline-level box, so `mx-auto` alone left this pinned
        // to the left of the collapsed rail.
        collapsed ? "mx-auto flex" : "w-full justify-start gap-3 px-3"
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
        title={collapsed ? "Expand sidebar" : undefined}
        onClick={(event) => {
          if (!collapsed) return

          // Links and controls retain their own action. The rail itself is a
          // large, forgiving expand target, rather than a tiny centre handle.
          if (
            event.target instanceof Element &&
            event.target.closest("a, button, input, [role=button]")
          )
            return

          onCollapsedChange(false)
        }}
        className={cn(
          "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-(--duration-panel) ease-(--ease-campus-snap) md:fixed md:inset-y-0 md:left-0 md:flex",
          collapsed ? "w-16 cursor-e-resize" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b border-sidebar-border px-3",
            collapsed ? "flex-col justify-center gap-1 py-2" : "justify-between"
          )}
        >
          <div className="flex min-w-0 items-center gap-1">
            <Brand
              collapsed={collapsed}
              onExpand={() => {
                onCollapsedChange(false)
              }}
            />
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Collapse sidebar"
                onClick={() => {
                  onCollapsedChange(true)
                }}
              >
                <PanelLeftIcon className="size-5" aria-hidden />
              </Button>
            </div>
          )}
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
      </aside>

      {/* Mobile */}
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-2 md:hidden">
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
