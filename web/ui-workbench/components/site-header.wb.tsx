import { useState } from "react"
import type { ReactNode } from "react"

import logoUrl from "@/assets/nuspace_logo.svg"
import { LayoutGridIcon, LogOutIcon, UserIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { SearchField } from "./search-field.wb"
import { SERVICE_HOSTS } from "./service-hosts"

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

/**
 * The launcher, as a grid of the six hosts with an icon and a name each.
 *
 * It is the one place in the product where every host is listed at once, so it
 * earns a grid rather than a list: six rows is a column, six tiles is a
 * launcher. Each opens that host's screen, so the button can be judged by
 * following it.
 *
 * Name only. The subdomain each host is reached at is where people type it,
 * not what they call it, and the bar already says which one you are on.
 */
function ServicesMenu() {
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

      <DropdownMenuContent align="end" className="w-96 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel>All services</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1">
            {SERVICE_HOSTS.map(({ id, name, entry, icon: Icon }) => (
              <DropdownMenuItem
                key={id}
                className="flex flex-col items-start gap-1.5 px-2 py-2.5"
                // The item's own children are the link's content; the anchor
                // only carries the href.
                // oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
                render={<a href={`?c=${entry}`} />}
              >
                <Icon className="size-5" aria-hidden />
                <span className="text-sm leading-tight whitespace-nowrap">
                  {name}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The account, and the two things it holds: the page it belongs to, and the way
 * out. Both sat at the foot of the sidebar until now, where they carried a
 * person's name and email down every route in the product.
 */
function AccountMenu({
  account,
  accountHref,
  onSignOut,
}: {
  account: { name: string; handle?: string }
  accountHref: string
  onSignOut?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account: ${account.name}`}
            className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Avatar className="size-8 shrink-0 rounded-full">
              <AvatarFallback className="bg-primary text-sm text-primary-foreground">
                {initials(account.name)}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block text-foreground">{account.name}</span>
            {account.handle ? (
              <span className="block font-normal">@{account.handle}</span>
            ) : null}
          </DropdownMenuLabel>

          <DropdownMenuItem
            // The item's own children are the link's content; the anchor only
            // carries the href.
            // oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label
            render={<a href={accountHref} />}
            className="justify-start gap-2"
          >
            <UserIcon aria-hidden />
            Account
          </DropdownMenuItem>

          <DropdownMenuItem
            className="justify-start gap-2"
            onClick={() => {
              onSignOut?.()
            }}
          >
            <LogOutIcon aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * The bar every page opens with.
 *
 * It is the same height on every route in the product, because it is on every
 * route, so it carries nothing that is not on every route: the mark, and the
 * controls on the right — the launcher, the account, and a way to Courses for
 * the root host, which is the service a student lands on most.
 *
 * It takes no buttons. A page that has a "create" or a "publish" or a "done"
 * belongs in the page, where the thing it acts on is; a header that changes
 * shape per route is not the same header twice, it is two headers and a
 * shared one. `rail` is a host's own trigger, passed in rather than built here:
 * a burger below `md`, nothing above it, because the rail is simply there.
 * `leading` replaces the mark, for the root host, which carries its mark in
 * the body, and for a host that brings its own switcher. `search` is a field
 * only the search screens fill, and it starts where the mark ends — which is
 * the left edge the results column starts at, so the field lines up with the
 * results below it. `rows` is a band under the bar: bands describe the host,
 * buttons do not.
 *
 * Sticky, because eight route screens need it. Google is not — it scrolls the
 * masthead away and pins a smaller field in its place — and that is behaviour
 * worth having, not styling worth faking here.
 */
export function SiteHeader({
  rail,
  leading,
  search,
  courses = false,
  account = null,
  accountHref = "?c=account",
  onSignOut,
  rows,
}: {
  rail?: ReactNode
  leading?: ReactNode
  search?: ReactNode
  /** A link to Courses, for the root host's corner. */
  courses?: boolean
  account?: { name: string; handle?: string } | null
  accountHref?: string
  onSignOut?: () => void
  rows?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-10 bg-background">
      <div className="flex h-14 items-center pr-3">
        {rail ? <div className="pl-4">{rail}</div> : null}

        {leading === undefined ? (
          // The mark holds the width the results column starts at, so the field
          // in the bar lands on the same left edge as the results below it.
          <a
            href="?c=nuspace"
            aria-label="Nuspace"
            className="flex shrink-0 items-center gap-2 pl-4 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:w-44"
          >
            <img src={logoUrl} alt="" aria-hidden className="size-6" />
            <span className="hidden text-lg font-semibold tracking-tight md:inline">
              Nuspace
            </span>
          </a>
        ) : (
          leading
        )}

        {/* The field starts where the mark ends, so it lands on the same left
            edge as the results below it. */}
        {search ? (
          <div className="ml-3 flex min-w-0 flex-1 items-center xl:ml-0">
            {search}
          </div>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {courses ? (
            <a href="?c=courses" className="text-sm text-primary hover:underline">
              Courses
            </a>
          ) : null}

          <ServicesMenu />

          {account ? (
            <AccountMenu
              account={account}
              accountHref={accountHref}
              onSignOut={onSignOut}
            />
          ) : (
            <a
              href="?c=account"
              className="text-sm text-primary hover:underline"
            >
              Sign in
            </a>
          )}
        </div>
      </div>

      {rows}
    </header>
  )
}

export default function SiteHeaderPreview() {
  const [signedIn, setSignedIn] = useState(true)

  return (
    <div className="flex min-h-full flex-col bg-background">
      <SiteHeader
        search={
          <div className="ml-4 max-w-2xl">
            <SearchField defaultValue="club ai" />
          </div>
        }
        courses
        account={{ name: "Aiza Tursyn", handle: "aiza" }}
        onSignOut={() => {
          setSignedIn(false)
        }}
      />

      <SiteHeader account={signedIn ? { name: "Aiza Tursyn", handle: "aiza" } : null} />

      <p className="px-4 py-3 text-sm text-muted-foreground">
        With the field, and without it. The mark is the way back to the root host
        on both. The controls on the right are the only ones ever there: the
        launcher opens a grid of the six hosts, the avatar opens the account.
      </p>
    </div>
  )
}
