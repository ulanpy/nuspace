import type { Environment, RouteTableRow, Service } from "./types"

export const ENVIRONMENTS = [
  "production",
  "staging",
  "development",
] as const satisfies readonly Environment[]

/** What both 404s say above the list of hosts. */
export const NOT_FOUND_LEAD =
  "Nuspace is six sites now, each at its own address:"

/**
 * The six hosts, in launcher order. The 404 page names all six whether or not
 * a host has a row in `ROUTE_TABLE` yet, so the list a lost visitor reads is
 * the 2.0 list from the first deploy.
 *
 * Staging mirrors production host for host. The `_staging` labels keep every
 * staging name one label under `.nuspace.kz`, which is what the free wildcard
 * certificates cover (#396). Development uses `*.localhost`, which browsers
 * resolve to loopback without a hosts-file entry.
 */
export const SERVICES: readonly Service[] = [
  {
    key: "root",
    name: "Search",
    prompt: "Searching for something?",
    hosts: {
      production: "nuspace.kz",
      staging: "stage.nuspace.kz",
      development: "localhost",
    },
  },
  {
    key: "courses",
    name: "Courses",
    prompt: "Looking for your courses?",
    hosts: {
      production: "courses.nuspace.kz",
      staging: "courses_staging.nuspace.kz",
      development: "courses.localhost",
    },
  },
  {
    key: "events",
    name: "Events",
    prompt: "Looking for events?",
    hosts: {
      production: "events.nuspace.kz",
      staging: "events_staging.nuspace.kz",
      development: "events.localhost",
    },
  },
  {
    key: "opportunities",
    name: "Opportunities",
    prompt: "Looking for opportunities?",
    hosts: {
      production: "opportunities.nuspace.kz",
      staging: "opportunities_staging.nuspace.kz",
      development: "opportunities.localhost",
    },
  },
  {
    key: "pages",
    name: "Pages",
    prompt: "Looking for a Page?",
    hosts: {
      production: "pages.nuspace.kz",
      staging: "pages_staging.nuspace.kz",
      development: "pages.localhost",
    },
  },
  {
    key: "my",
    name: "My Nuspace",
    prompt: "Looking for people or your account?",
    hosts: {
      production: "my.nuspace.kz",
      staging: "my_staging.nuspace.kz",
      development: "my.localhost",
    },
  },
]

/**
 * The host→route table: which host serves which route. It is the only place
 * route ownership is written down. `pnpm hosts:generate` turns it into the
 * nginx include (`web/nginx/hosts.conf`) and the per-environment 404 pages,
 * the build turns it into one `index.html` per host, and the router's rewrite
 * reads it to map a host's paths onto the one route tree.
 *
 * A host with no row is not served: nginx answers every path on it with the
 * 404 page. A path its host's row does not list is a 404 too, before any
 * JavaScript loads.
 *
 * `pnpm hosts:check` (run first by `pnpm build`, so CI runs it) fails when a
 * route in `routeTree.gen.ts` is claimed by no row or by two, when a row names
 * a path the router lacks, or when the committed nginx files are stale. A `$`
 * segment is a claim like any other: `/$eventId` under the `/events` mount
 * claims the router's `/events/$eventId`, and nginx matches it with a regex.
 *
 * Adding a host (phase 2's service tickets):
 *
 *  1. Move the service's routes under one router directory, its mount, and
 *     give each the path it has on its host (`courses./stats` is the router's
 *     `/courses/stats`). Pick a mount nothing else lives under.
 *  2. Add the row with that mount, and delete the same paths from the root
 *     row's `unmigrated`. Until then the root host still serves them at their
 *     old address, which keeps every unmigrated screen reachable in dev and on
 *     staging while the services move one at a time.
 *  3. Run `pnpm hosts:generate` and commit what it writes.
 *
 * `unmigrated` is what keeps the ownership check strict during phase 2. The
 * root host could have claimed "everything nobody else claims", but then a
 * route that fell out of the table would still pass. Listing each path means
 * a new route must be placed somewhere, and an empty `unmigrated` is how the
 * cutover (#448) shows the move is finished.
 */
export const ROUTE_TABLE: readonly RouteTableRow[] = [
  {
    service: "root",
    mount: "",
    routes: ["/", "/about", "/privacy", "/terms"],
    unmigrated: [
      "/announcements",
      "/contacts",
      "/mynuspace",
      "/sgotinish",
    ],
  },
  {
    service: "events",
    mount: "/events",
    routes: ["/", "/$eventId"],
    params: { eventId: "[0-9]+" },
  },
  {
    service: "opportunities",
    mount: "/opportunities",
    routes: ["/"],
  },
  {
    // The account host. `/` (the people directory), `/profile`,
    // `/profile/edit` and `/u/$handle` join this row with #434 and #436.
    service: "my",
    mount: "/my",
    routes: ["/account", "/pages"],
  },
  {
    service: "courses",
    mount: "/courses",
    routes: ["/", "/stats", "/planner", "/audit", "/audit/guide"],
  },
  {
    service: "pages",
    mount: "/pages",
    routes: ["/", "/$slug", "/$slug/settings", "/$slug/edit"],
    // The slug rule (`lib/slug.ts`), so `pages.nuspace.kz/Chess_Club` is a
    // 404 before any JavaScript loads. The words a slug may not be are kept
    // out by `RESERVED_SLUGS`, not here: nginx answers its own paths first.
    params: { slug: "[a-z0-9]+(-[a-z0-9]+)*" },
  },
]
