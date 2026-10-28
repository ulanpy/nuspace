import { Link, useRouterState } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { LogOutIcon, UserIcon } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLogout } from "@/hooks/use-logout"
import { currentBrowserPath, loginHref, sessionQueryOptions } from "@/lib/user"
import type { CurrentUser } from "@/lib/user"

/**
 * "Sign in", returning to the host and path the visitor is on. The link goes
 * to this host's `/api/login`, so the backend sends them back to this host,
 * and `return_to` is the browser path here, not the router's.
 */
function SignIn() {
  // Re-render on navigation, so the link always carries the current path.
  useRouterState({ select: (state) => state.location.href })

  return (
    <a
      href={loginHref({
        returnTo: currentBrowserPath(window.location),
        origin: window.location.origin,
      })}
      className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      Sign in
    </a>
  )
}

function AccountMenu({ user }: { user: CurrentUser }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account: ${user.name}`}
            className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Avatar className="size-8">
              {user.picture ? <AvatarImage src={user.picture} alt="" /> : null}
              <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                {user.given_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate text-foreground">{user.name}</span>
            <span className="block truncate font-normal">{user.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem
            render={<Link to="/account" />}
            className="justify-start gap-2"
          >
            <UserIcon aria-hidden />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem
            className="justify-start gap-2"
            disabled={logout.isPending}
            onClick={() => {
              logout.mutate()
            }}
          >
            <LogOutIcon aria-hidden />
            {logout.isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The header's right-most control: the account menu, or "Sign in". Nothing
 * while the session is loading, so the bar never flashes "Sign in" at someone
 * who is signed in.
 */
export function AccountControl() {
  const { data: session, isPending } = useQuery(sessionQueryOptions)

  if (isPending) return <div className="size-8" aria-hidden />
  return session ? <AccountMenu user={session.user} /> : <SignIn />
}
