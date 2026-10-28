import {
  ExternalLinkIcon,
  FilesIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"

import type { RailSection } from "@/components/layouts/site"
import { MyPagesCount } from "./my-pages-count"

/**
 * The account host's rail, in the order it shows them. One flat list.
 *
 * People is last and carries an external-link icon because it is the only row
 * here that is not about you: it is a directory of everyone, public, and the
 * one thing on this host a signed-out visitor can open. Every other row is
 * `requiresSession`, so a signed-out visitor's rail is People alone.
 *
 * Profile and People have no route yet (#434, #436), so they go to the address
 * they will have on this host. Each ticket swaps its `href` for a `to`.
 */
export const ACCOUNT_SECTIONS: readonly RailSection[] = [
  {
    to: "/my/account",
    label: "Account",
    icon: LayoutDashboardIcon,
    requiresSession: true,
  },
  {
    to: "/my/pages",
    label: "My Pages",
    icon: FilesIcon,
    badge: MyPagesCount,
    requiresSession: true,
  },
  {
    href: "/profile",
    label: "Profile",
    icon: SettingsIcon,
    requiresSession: true,
  },
  {
    href: "/",
    label: "People",
    icon: UsersIcon,
    trailing: ExternalLinkIcon,
  },
]
