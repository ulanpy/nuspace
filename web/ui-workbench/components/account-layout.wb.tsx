import type { ReactNode } from "react"

import {
  ExternalLinkIcon,
  FilesIcon,
  LayoutDashboardIcon,
  LogInIcon,
  MenuIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import { SidebarRail, SidebarSheet, type RailItem } from "./app-sidebar.wb"

export type AccountSection = "/account" | "/pages" | "/profile" | "/people"

/**
 * The account host's sections, in the order the rail shows them.
 *
 * One flat list. People is last and carries an external-link icon because it is
 * the only row here that is not about you: it is a directory of everyone, it is
 * public, and it is the one thing on this host an anonymous visitor can open.
 *
 * `/people` is therefore the only row a signed-out visitor keeps. Everything
 * else is session-gated and swaps its body for a sign-in prompt rather than
 * redirecting.
 */
const SECTIONS: RailItem[] = [
  {
    id: "/account",
    label: "Account",
    icon: LayoutDashboardIcon,
    href: "?c=account",
  },
  { id: "/pages", label: "My Pages", icon: FilesIcon, href: "?c=my-pages" },
  {
    id: "/profile",
    label: "Profile",
    icon: SettingsIcon,
    href: "?c=profile-settings",
  },
  {
    id: "/people",
    label: "People",
    icon: UsersIcon,
    href: "?c=people",
    trailing: ExternalLinkIcon,
  },
]

function railProps({
  at,
  signedIn,
  pageCount = 0,
}: {
  at: AccountSection
  signedIn: boolean
  pageCount?: number
}): { items: RailItem[]; activeId: string | null } {
  const visible = signedIn
    ? SECTIONS
    : SECTIONS.filter((section) => section.id === "/people")

  return {
    items: visible.map((section) =>
      section.id === "/pages" && pageCount > 0
        ? { ...section, badge: pageCount }
        : section
    ),
    activeId: at,
  }
}

/**
 * The rail's trigger in the header. Below `md` there is no rail, so it is a
 * burger; above it the rail is simply there and needs no button to summon or
 * fold it.
 */
export function AccountSections({
  at,
  signedIn,
  pageCount,
}: {
  at: AccountSection
  signedIn: boolean
  pageCount?: number
}) {
  return (
    <SidebarSheet
      {...railProps({ at, signedIn, pageCount })}
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
  )
}

export function AccountLayout({
  at,
  signedIn,
  pageCount,
  gated = true,
  children,
}: {
  at: AccountSection
  signedIn: boolean
  pageCount?: number
  gated?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <SidebarRail {...railProps({ at, signedIn, pageCount })} />

      <div className="flex min-w-0 flex-1 flex-col">
        {signedIn || !gated ? (
          children
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <Empty className="border border-dashed">
              <EmptyHeader>
                <EmptyTitle>Sign in to see this</EmptyTitle>
                <EmptyDescription>
                  Your dashboard, the pages you own or administer, and your
                  profile settings are yours alone. Sign in and this is where
                  you left off.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button>
                  <LogInIcon aria-hidden />
                  Sign in
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AccountLayoutPreview() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <div className="flex h-14 items-center gap-3 border-b px-4">
        <AccountSections at="/account" signedIn pageCount={8} />
        <span className="text-sm text-muted-foreground">
          The rail every route on my.nuspace.kz shares, beside the shared
          header. Same chrome as the app&apos;s own sidebar, this host&apos;s
          sections in it.
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <AccountLayout at="/account" signedIn pageCount={8}>
          <div className="min-w-0 flex-1 p-6 text-sm text-muted-foreground">
            Everything else about this host lives to the right of the rail.
          </div>
        </AccountLayout>
      </div>
    </div>
  )
}
