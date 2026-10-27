/**
 * Everything the route table generates at build time: the ownership check, the
 * nginx include, the 404 pages and the per-host `index.html`. Pure functions
 * over strings, so the build plugin and `scripts/hosts.mjs` stay thin and the
 * tests need no filesystem. Nothing here ships in the app bundle.
 */
import { ENVIRONMENTS } from "./constants"
import {
  destinations,
  isUnderMount,
  serviceByKey,
  toRouterPath,
} from "./functions"
import type { Environment, RouteTableRow, Service, ServiceKey } from "./types"

export interface Claim {
  service: ServiceKey
  /** As written in the table. */
  path: string
  /** The route-tree path it claims, without a trailing slash. */
  routerPath: string
  unmigrated: boolean
}

function withoutTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
}

export function claimsOf(table: readonly RouteTableRow[]): Claim[] {
  return table.flatMap((row) => [
    ...row.routes.map((path) => ({
      service: row.service,
      path,
      routerPath: withoutTrailingSlash(toRouterPath(row.mount, path)),
      unmigrated: false,
    })),
    ...(row.unmigrated ?? []).map((path) => ({
      service: row.service,
      path,
      routerPath: withoutTrailingSlash(path),
      unmigrated: true,
    })),
  ])
}

export interface RouteTree {
  /** Every navigable path, as `FileRoutesByTo` lists them. */
  paths: string[]
  /**
   * The route files that render a path, root first: its own file and every
   * layout above it. Relative to `src/`, without extension.
   */
  files: (path: string) => string[]
}

/**
 * Reads the committed `routeTree.gen.ts`. The router plugin's output format is
 * stable and generated, so a few regular expressions are enough; a format
 * change fails loudly here rather than passing silently.
 */
export function parseRouteTree(source: string): RouteTree {
  const imports = new Map<string, string>()
  for (const [, name, from] of source.matchAll(
    /import \{ Route as (\w+) \} from '\.\/([^']+)'/g
  )) {
    imports.set(name, from)
  }

  const routes = new Map<string, { importName: string; parent: string }>()
  for (const [, name, importName, body] of source.matchAll(
    /const (\w+) =\s+(\w+)\.update\(\{([\s\S]*?)\} as any\)/g
  )) {
    const parent = /getParentRoute: \(\) => (\w+)/.exec(body)?.[1]
    if (!parent) throw new Error(`routeTree.gen.ts: ${name} has no parent`)
    routes.set(name, { importName, parent })
  }

  const byTo = /export interface FileRoutesByTo \{([\s\S]*?)\n\}/.exec(source)
  if (!byTo || imports.size === 0 || routes.size === 0) {
    throw new Error("routeTree.gen.ts is not in the format this parser reads")
  }
  const paths = new Map<string, string>()
  for (const [, path, name] of byTo[1].matchAll(/'([^']+)': typeof (\w+)/g)) {
    paths.set(path, name.replace(/WithChildren$/, ""))
  }

  return {
    paths: [...paths.keys()],
    files: (path) => {
      const files: string[] = []
      let name = paths.get(path)
      while (name) {
        const route = routes.get(name)
        const from = imports.get(route ? route.importName : name)
        if (!from) throw new Error(`routeTree.gen.ts: no import for ${name}`)
        files.unshift(from)
        name = route?.parent
      }
      return files
    },
  }
}

const SEGMENT = /^(?:\$[A-Za-z_]\w*|[A-Za-z0-9._~-]+)$/

/**
 * Every way the table and the route tree can disagree. Empty means they
 * agree; anything else fails the build.
 */
export function checkOwnership(
  table: readonly RouteTableRow[],
  routerPaths: readonly string[]
): string[] {
  const errors: string[] = []

  const roots = table.filter((row) => row.mount === "")
  if (roots.length !== 1 || roots[0].service !== "root") {
    errors.push(`exactly one row, the root host's, has mount ""`)
  }
  const seen = new Set<string>()
  for (const row of table) {
    if (seen.has(row.service)) errors.push(`${row.service} has two rows`)
    seen.add(row.service)
    if (row.mount !== "" && !/^(?:\/[a-z0-9-]+)+$/.test(row.mount)) {
      errors.push(`${row.service}: mount "${row.mount}" is not a plain path`)
    }
    if (row.unmigrated && row.mount !== "") {
      errors.push(`${row.service}: only the root host lists unmigrated paths`)
    }
    for (const [name, pattern] of Object.entries(row.params ?? {})) {
      // One segment, and nothing that would end the quoted nginx map key.
      if (/[/"\s;]|^\^|\$$/.test(pattern)) {
        errors.push(
          `${row.service}: params.${name} must match within one segment`
        )
      }
      if (!row.routes.some((route) => route.split("/").includes(`$${name}`))) {
        errors.push(`${row.service}: params.${name} names no route parameter`)
      }
    }
  }

  const claims = claimsOf(table)
  const byPath = new Map<string, Claim[]>()
  for (const claim of claims) {
    const segments = claim.path.split("/").slice(1).filter(Boolean)
    if (
      !claim.path.startsWith("/") ||
      !segments.every((s) => SEGMENT.test(s))
    ) {
      errors.push(`${claim.service}: "${claim.path}" is not a route path`)
    }
    for (const other of table) {
      if (
        other.service !== claim.service &&
        isUnderMount(claim.routerPath, other.mount)
      ) {
        errors.push(
          `${claim.service}: "${claim.path}" lies under ${other.service}'s mount "${other.mount}"`
        )
      }
    }
    byPath.set(claim.routerPath, [
      ...(byPath.get(claim.routerPath) ?? []),
      claim,
    ])
  }

  const known = new Set(routerPaths.map(withoutTrailingSlash))
  for (const path of known) {
    const owners = byPath.get(path) ?? []
    if (owners.length === 0) {
      errors.push(`route "${path}" is claimed by no host`)
    } else if (owners.length > 1) {
      const names = owners.map((c) => `${c.service} ("${c.path}")`).join(", ")
      errors.push(`route "${path}" is claimed by ${owners.length}: ${names}`)
    }
  }
  for (const claim of claims) {
    if (!known.has(claim.routerPath)) {
      errors.push(
        `${claim.service}: "${claim.path}" names "${claim.routerPath}", which the router lacks`
      )
    }
  }

  return errors
}

const BANNER = `# GENERATED FILE — DO NOT EDIT.
# Source: web/src/lib/hosts/constants.ts. Regenerate with \`pnpm hosts:generate\`.`

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The map entries that match one claimed path on one host. A static path is
 * two exact entries, with and without the trailing slash. A path with a `$`
 * segment is one regex, each parameter matching a single segment.
 */
function routeEntries(
  service: ServiceKey,
  path: string,
  params: Readonly<Record<string, string>> = {}
): string[] {
  const segments = path.split("/").filter(Boolean)
  if (segments.length === 0) return [`"${service}:/"`]
  if (!segments.some((segment) => segment.startsWith("$"))) {
    const exact = `${service}:/${segments.join("/")}`
    return [`"${exact}"`, `"${exact}/"`]
  }
  const pattern = segments
    .map((segment) =>
      segment.startsWith("$")
        ? (params[segment.slice(1)] ?? "[^/]+")
        : escapeRegex(segment)
    )
    .join("/")
  return [`"~^${escapeRegex(service)}:/${pattern}/?$"`]
}

function mapBlock(
  head: string,
  fallback: string,
  entries: Array<[string, string]>
): string {
  const width = Math.max(...entries.map(([key]) => key.length))
  const lines = entries.map(
    ([key, value]) => `    ${key.padEnd(width)} ${value};`
  )
  return [`map ${head} {`, `    default ${fallback};`, ...lines, "}"].join("\n")
}

/**
 * The nginx include, at `http` level. It sets three variables the server
 * blocks in `infra/nginx/` read:
 *
 *  - `$nuspace_service`: the host's row, `""` for a host with none;
 *  - `$nuspace_env`: which environment's 404 page to answer with;
 *  - `$nuspace_owned`: `1` when the host's row claims the path.
 *
 * Unmigrated paths are claims like any other here: the root host serves them.
 */
export function renderNginxInclude(
  table: readonly RouteTableRow[],
  services: readonly Service[]
): string {
  const hostRows: Array<[string, string]> = []
  const envRows: Array<[string, string]> = []
  for (const service of services) {
    for (const environment of ENVIRONMENTS) {
      const host = service.hosts[environment]
      if (table.some((row) => row.service === service.key)) {
        hostRows.push([host, service.key])
      }
      if (environment !== "production") envRows.push([host, environment])
    }
  }

  const routeRows: Array<[string, string]> = []
  for (const row of table) {
    for (const path of [...row.routes, ...(row.unmigrated ?? [])]) {
      for (const entry of routeEntries(row.service, path, row.params)) {
        routeRows.push([entry, "1"])
      }
    }
  }

  return [
    BANNER,
    "#",
    "# Included at `http` level by infra/nginx/nginx.conf and nginx.dev.conf.",
    "# A host with no row maps to an empty service, so every path on it is a 404.",
    "",
    mapBlock("$host $nuspace_service", '""', hostRows),
    "",
    mapBlock("$host $nuspace_env", "production", envRows),
    "",
    "# Exact entries are looked up first; the regexes, one per path with a `$`",
    "# segment, are tried in order after them.",
    mapBlock('"$nuspace_service:$uri" $nuspace_owned', "0", routeRows),
    "",
  ].join("\n")
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/**
 * The page nginx answers every 404 with: a wrong host, a removed 1.0 address,
 * a typo. It names the six hosts and maps nothing, because a per-URL mapping
 * is a redirect table by another name (#416). It loads no script, so a 404
 * fetches nothing of the app.
 */
export function renderNotFoundPage(
  services: readonly Service[],
  environment: Environment
): string {
  const root = serviceByKey("root", services)
  const items = destinations(root.hosts[environment], services)
    .map(
      (destination) =>
        `        <li>${escapeHtml(destination.prompt)} <a href="${escapeHtml(destination.href)}">${escapeHtml(destination.host)}</a></li>`
    )
    .join("\n")

  return `<!doctype html>
<!-- GENERATED FILE — DO NOT EDIT. Source: web/src/lib/hosts/constants.ts. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>Page not found · Nuspace</title>
    <style>
      :root {
        color-scheme: light dark;
        --background: #ffffff;
        --foreground: #0a0a0a;
        --muted: #737373;
        --border: #e5e5e5;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --background: #0a0a0a;
          --foreground: #fafafa;
          --muted: #a3a3a3;
          --border: #262626;
        }
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        box-sizing: border-box;
        background: var(--background);
        color: var(--foreground);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        line-height: 1.5;
      }
      main { max-width: 28rem; }
      .code { margin: 0; font-size: 0.875rem; font-weight: 500; color: var(--muted); }
      h1 { margin: 0.5rem 0; font-size: 1.875rem; letter-spacing: -0.025em; }
      p { margin: 0 0 1.5rem; color: var(--muted); }
      ul { margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border); }
      li { padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
      a { color: inherit; font-weight: 600; }
    </style>
  </head>
  <body>
    <main>
      <p class="code">404</p>
      <h1>Page not found</h1>
      <p>Nothing lives at this address. Nuspace is six sites now, each at its own address:</p>
      <ul>
${items}
      </ul>
    </main>
  </body>
</html>
`
}

/** The built `index.html` with one host's route chunks added to its preloads. */
export function withPreloads(html: string, hrefs: readonly string[]): string {
  if (!html.includes("</head>")) throw new Error("index.html has no </head>")
  const links = hrefs
    .map(
      (href) => `\n    <link rel="modulepreload" crossorigin href="${href}">`
    )
    .join("")
  return html.replace(
    /(\s*)<\/head>/,
    (_, space: string) => `${links}${space}</head>`
  )
}
