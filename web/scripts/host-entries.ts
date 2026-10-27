import { readFileSync } from "node:fs"
import path from "node:path"
import type { Plugin } from "vite-plus"

import { ROUTE_TABLE } from "../src/lib/hosts/constants.ts"
import { toRouterPath } from "../src/lib/hosts/functions.ts"
import { parseRouteTree, withPreloads } from "../src/lib/hosts/generate.ts"

interface ChunkLike {
  type: "chunk"
  fileName: string
  isEntry: boolean
  imports: string[]
  moduleIds: string[]
}

/**
 * One `index.html` per host, over the one shared `assets/` (#396).
 *
 * Vite builds a single `index.html` whose preloads are the entry's static
 * imports: the router, the shell and every route file's eager half. Those load
 * on every host whatever the HTML says, so each host's copy keeps them and
 * adds the lazy chunks of the screens that host serves, so its screens arrive
 * alongside the entry instead of after it. No host preloads another host's
 * screens. The root host's `unmigrated` paths are served but never preloaded.
 *
 * The output is `_hosts/<service>/index.html`; nginx picks the file from
 * `$nuspace_service` (web/nginx/hosts.conf). There is no top-level
 * `index.html`, so no path can be served an HTML that is not its host's.
 */
export function hostEntries(web: string): Plugin {
  return {
    name: "nuspace:host-entries",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const html = bundle["index.html"]
      if (html?.type !== "asset" || typeof html.source !== "string") {
        this.error("index.html is missing from the bundle")
      }
      const chunks = Object.values(bundle).filter(
        (item): item is typeof item & ChunkLike => item.type === "chunk"
      )
      const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
      const closure = (roots: readonly ChunkLike[]): Set<string> => {
        const seen = new Set<string>()
        const stack = roots.map((chunk) => chunk.fileName)
        while (stack.length > 0) {
          const name = stack.pop()!
          if (seen.has(name)) continue
          seen.add(name)
          stack.push(...(byName.get(name)?.imports ?? []))
        }
        return seen
      }

      const entry = chunks.filter((chunk) => chunk.isEntry)
      const shared = closure(entry)
      const tree = parseRouteTree(
        readFileSync(path.join(web, "src/routeTree.gen.ts"), "utf8")
      )

      for (const row of ROUTE_TABLE) {
        // A route's lazy half is a module `<file>.tsx?tsr-split=…` emitted
        // by the router plugin's code splitting.
        const files = new Set(
          row.routes.flatMap((route) =>
            tree
              .files(toRouterPath(row.mount, route))
              .map((file) => `${path.join(web, "src", file)}.tsx?tsr-split`)
          )
        )
        const screens = chunks.filter((chunk) =>
          chunk.moduleIds.some((id) =>
            [...files].some((prefix) => id.startsWith(prefix))
          )
        )
        // Every row has a screen; finding none means the split-module naming
        // changed and the preloads would silently go missing.
        if (screens.length === 0) {
          this.error(`no route chunks found for the ${row.service} host`)
        }
        const preloads = [...closure(screens)]
          .filter((name) => !shared.has(name))
          .sort()
          .map((name) => `/${name}`)

        this.emitFile({
          type: "asset",
          fileName: `_hosts/${row.service}/index.html`,
          source: withPreloads(html.source, preloads),
        })
      }
      delete bundle["index.html"]
    },
  }
}
