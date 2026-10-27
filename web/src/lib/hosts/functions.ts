import { ENVIRONMENTS, ROUTE_TABLE, SERVICES } from "./constants"
import type { Environment, RouteTableRow, Service, ServiceKey } from "./types"

export interface HostMatch {
  service: Service
  environment: Environment
}

/** Which of the six hosts, in which environment, a hostname is. */
export function hostOf(
  hostname: string,
  services: readonly Service[] = SERVICES
): HostMatch | undefined {
  const name = hostname.toLowerCase()
  for (const service of services) {
    for (const environment of ENVIRONMENTS) {
      if (service.hosts[environment] === name) return { service, environment }
    }
  }
  return undefined
}

export function serviceByKey(
  key: ServiceKey,
  services: readonly Service[] = SERVICES
): Service {
  const service = services.find((candidate) => candidate.key === key)
  if (!service) throw new Error(`No service "${key}"`)
  return service
}

/**
 * The address a host is reached at. Development is plain HTTP through the
 * compose nginx on :80; everything else is HTTPS behind Cloudflare.
 */
export function hostHref(host: string, environment: Environment): string {
  return `${environment === "development" ? "http" : "https"}://${host}/`
}

export interface Destination {
  key: ServiceKey
  prompt: string
  host: string
  href: string
}

/**
 * The six hosts as the 404 page lists them, in the environment the visitor
 * is in, so a 404 on staging never sends anyone to production. An unknown
 * hostname gets the production list.
 */
export function destinations(
  hostname: string,
  services: readonly Service[] = SERVICES
): Destination[] {
  const environment = hostOf(hostname, services)?.environment ?? "production"
  return services.map((service) => {
    const host = service.hosts[environment]
    return {
      key: service.key,
      prompt: service.prompt,
      host,
      href: hostHref(host, environment),
    }
  })
}

/** Whether a router path is `mount` itself or below it. */
export function isUnderMount(path: string, mount: string): boolean {
  return mount !== "" && (path === mount || path.startsWith(`${mount}/`))
}

/** A browser path on a host, as the router path it renders: `/42` → `/events/42`. */
export function toRouterPath(mount: string, path: string): string {
  return path === "/" ? mount || "/" : `${mount}${path}`
}

/** The inverse of `toRouterPath`: `/events/42` → `/42`. */
export function fromRouterPath(mount: string, path: string): string {
  return path.slice(mount.length) || "/"
}

/**
 * The row whose host serves a router path: the one whose mount holds it, or
 * the root host's when no mount does. This is the same rule the ownership
 * check enforces, so a link never points at a host that would 404 it.
 */
export function rowForRouterPath(
  path: string,
  table: readonly RouteTableRow[] = ROUTE_TABLE
): RouteTableRow {
  let owner = table.find((row) => row.mount === "")
  if (!owner) throw new Error("The route table has no root row")
  for (const row of table) {
    if (isUnderMount(path, row.mount) && row.mount.length > owner.mount.length)
      owner = row
  }
  return owner
}

interface RewriteArgs {
  url: URL
}

/**
 * The router's URL rewrite: one route tree, six hosts.
 *
 * On the way in, the host's mount is put in front of the browser path, so
 * `events.nuspace.kz/42` renders the router's `/events/42`. On the way out,
 * a router path is given the host that owns it: from the events host,
 * `<Link to="/events/42">` renders `/42`, and from any other host it renders
 * `https://events.nuspace.kz/42`, which the router follows with a full page
 * load because the origin differs.
 *
 * This decides nothing about which routes exist. nginx has already answered a
 * path the host does not own with a 404 before this code was fetched. A
 * hostname outside the table (an IP, a tunnel) is left alone, so the app still
 * works path-for-path there.
 */
export function createHostRewrite(
  table: readonly RouteTableRow[] = ROUTE_TABLE,
  services: readonly Service[] = SERVICES
) {
  return {
    input: ({ url }: RewriteArgs): URL | undefined => {
      const here = hostOf(url.hostname, services)
      const row = here && table.find((r) => r.service === here.service.key)
      if (!row || row.mount === "") return undefined
      url.pathname = toRouterPath(row.mount, url.pathname)
      return url
    },
    output: ({ url }: RewriteArgs): URL | undefined => {
      const here = hostOf(url.hostname, services)
      if (!here) return undefined
      const owner = rowForRouterPath(url.pathname, table)
      url.pathname = fromRouterPath(owner.mount, url.pathname)
      if (owner.service !== here.service.key) {
        url.hostname = serviceByKey(owner.service, services).hosts[
          here.environment
        ]
      }
      return url
    },
  }
}
