/** Where a hostname is served from. Each one names its own six hosts. */
export type Environment = "production" | "staging" | "development"

export type ServiceKey =
  | "root"
  | "courses"
  | "events"
  | "opportunities"
  | "pages"
  | "my"

/** One of the six first-party hosts, as a visitor knows it. */
export interface Service {
  key: ServiceKey
  /** The 404 page's question for this host: "Looking for events?". */
  prompt: string
  hosts: Record<Environment, string>
}

/** One host's claim on the route tree. See `ROUTE_TABLE`. */
export interface RouteTableRow {
  service: ServiceKey
  /**
   * The router path this host's routes live under, `""` for the root host.
   * `events.nuspace.kz/42` is the router's `/events/42`: the mount is added to
   * the browser path on the way in and removed on the way out.
   */
  mount: string
  /** Paths the host serves, as the browser sees them: `"/"`, `"/$eventId"`. */
  routes: readonly string[]
  /**
   * What nginx accepts for a `$` segment, as a regex fragment. A parameter not
   * listed matches any one segment. `{ eventId: "[0-9]+" }` keeps
   * `events.nuspace.kz/about` a 404 rather than an event that never loads.
   */
  params?: Readonly<Record<string, string>>
  /**
   * Root host only, and only until phase 2 finishes: router paths whose
   * service host has no row yet. Served on the root host at their old address
   * and never preloaded. Each service ticket removes its paths from here.
   */
  unmigrated?: readonly string[]
}
