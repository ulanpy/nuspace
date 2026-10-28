import { Link } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  FileTextIcon,
  LayoutGridIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react"
import type { LinkProps } from "@tanstack/react-router"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ServiceKey } from "@/lib/hosts"
import { launcherItems } from "@/lib/shell"
import { cn } from "@/lib/utils"

/**
 * Where each tile goes, as a router path. The router's host rewrite turns it
 * into the host that serves it, in the visitor's environment, so a service
 * still on the root host (phase 2) is linked where it is today and moves
 * with its row in the route table.
 *
 * A service ticket that moves its front door changes its line here; the type
 * is the route tree's, so a stale one fails the build.
 */
const FRONT_DOORS: Record<
  ServiceKey,
  { to: LinkProps["to"]; icon: LucideIcon }
> = {
  root: { to: "/", icon: SearchIcon },
  courses: { to: "/courses", icon: BookOpenIcon },
  events: { to: "/events", icon: CalendarDaysIcon },
  opportunities: { to: "/opportunities", icon: BriefcaseIcon },
  pages: { to: "/mynuspace", icon: FileTextIcon },
  my: { to: "/account", icon: UserIcon },
}

/** Read once: the hostname only decides which tile is lit. */
const ITEMS = launcherItems(window.location.hostname)

/**
 * The launcher: a grid of the six hosts, the one place every host is listed
 * at once. Name only; the bar already says which host you are on, and the
 * tile for it is lit.
 */
export function Launcher() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="All Nuspace services"
          >
            <LayoutGridIcon className="size-5" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80 p-2 sm:w-96">
        <DropdownMenuGroup>
          <DropdownMenuLabel>All services</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1">
            {ITEMS.map(({ key, name, current }) => {
              const { to, icon: Icon } = FRONT_DOORS[key]
              return (
                <DropdownMenuItem
                  key={key}
                  render={<Link to={to} />}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "flex flex-col items-start gap-1.5 px-2 py-2.5",
                    current && "bg-accent text-accent-foreground"
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="text-sm/tight whitespace-nowrap">
                    {name}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
