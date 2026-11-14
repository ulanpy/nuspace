import {
  BookOpenIcon,
  CalendarDaysIcon,
  FileTextIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react"

/**
 * The six hosts, in the order the launcher shows them. `entry` is the workbench
 * screen that stands in for the host, so every link in the workbench can be
 * followed: the launcher, the footer's links, the error page's list of the
 * other hosts.
 */
export const SERVICE_HOSTS = [
  {
    id: "nuspace",
    name: "Search",
    host: "nuspace.kz",
    entry: "nuspace",
    icon: SearchIcon,
  },
  {
    id: "courses",
    name: "Courses",
    host: "courses.nuspace.kz",
    entry: "courses",
    icon: BookOpenIcon,
  },
  {
    id: "events",
    name: "Events",
    host: "events.nuspace.kz",
    entry: "events",
    icon: CalendarDaysIcon,
  },
  {
    id: "pages",
    name: "Pages",
    host: "pages.nuspace.kz",
    entry: "pages",
    icon: FileTextIcon,
  },
  {
    id: "my",
    name: "My Nuspace",
    host: "my.nuspace.kz",
    // The host's front door is the people directory; the account lives under
    // /account and is reached from the avatar menu.
    entry: "people",
    icon: UserIcon,
  },
] as const

export type ServiceHost = (typeof SERVICE_HOSTS)[number]["id"]

/** Where a host is reached in the workbench. */
export const hostUrl = (host: ServiceHost) =>
  `?c=${SERVICE_HOSTS.find((entry) => entry.id === host)!.entry}`

/** The public address of an event, as it is shared outside the app. */
export const eventUrl = (id: number) =>
  `https://${SERVICE_HOSTS.find((entry) => entry.id === "events")!.host}/events/${id}`

/**
 * Google's own footer says "Google" and its links say "Advertising", "Privacy &
 * Terms"; ours has no ad network, so what is left is the three legal routes
 * that stay as code at the root domain. None of them has a screen here yet.
 */
export const FOOTER_LINKS = [
  { label: "About", href: "#" },
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
] as const
