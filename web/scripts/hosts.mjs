#!/usr/bin/env node
/**
 * Writes the nginx side of the host→route table (src/lib/hosts/constants.ts):
 *
 *   nginx/hosts.conf        the include both nginx configs load
 *   nginx/404.<env>.html    the page nginx answers every 404 with
 *
 *   pnpm hosts:generate     write them; runs before `pnpm dev`
 *   pnpm hosts:check        fail if the table and the committed route tree
 *                           disagree, or the files above are stale; runs
 *                           first in `pnpm build`, so CI runs it
 *
 * The files are committed rather than built. nginx reads them from the repo
 * checkout because the deploy role empties web/out/ before unpacking a build,
 * and a config file inside it would be missing mid-deploy (#396). The
 * per-host index.html files are build output: see scripts/host-entries.ts.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve, relative } from "node:path"
import { fileURLToPath } from "node:url"

import {
  ENVIRONMENTS,
  ROUTE_TABLE,
  SERVICES,
} from "../src/lib/hosts/constants.ts"
import {
  checkOwnership,
  parseRouteTree,
  renderNginxInclude,
  renderNotFoundPage,
} from "../src/lib/hosts/generate.ts"

const web = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const check = process.argv.includes("--check")

const outputs = new Map([
  ["nginx/hosts.conf", renderNginxInclude(ROUTE_TABLE, SERVICES)],
  ...ENVIRONMENTS.map((environment) => [
    `nginx/404.${environment}.html`,
    renderNotFoundPage(SERVICES, environment),
  ]),
])

const tree = parseRouteTree(
  await readFile(resolve(web, "src/routeTree.gen.ts"), "utf8")
)
const problems = checkOwnership(ROUTE_TABLE, tree.paths)
for (const problem of problems) {
  console.error(`route table: ${problem}`)
}

for (const [path, expected] of outputs) {
  const target = resolve(web, path)
  const current = await readFile(target, "utf8").catch(() => null)
  if (current === expected) continue
  if (check) {
    problems.push(path)
    console.error(`route table: ${path} is stale; run \`pnpm hosts:generate\``)
  } else {
    // Unchanged files are left alone: the dev nginx reloads on every write.
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, expected)
    console.log(`route table: wrote ${relative(web, target)}`)
  }
}

if (check) {
  if (problems.length > 0) process.exit(1)
  console.log(
    `route table: ${tree.paths.length} routes, each owned by one host`
  )
}
