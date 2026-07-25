#!/usr/bin/env node
/**
 * Generates src/api/schema.d.ts from the backend's OpenAPI document.
 *
 * The backend only serves /api/openapi.json when IS_DEBUG=true (the local
 * Docker default) — see backend/main.py. There is no schema endpoint in
 * production, which is fine: this is a build-time artifact and the generated
 * file is committed.
 *
 *   pnpm api:generate          write src/api/schema.d.ts
 *   pnpm api:check             fail if the committed file is out of date
 */
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import openapiTS, { astToString } from "openapi-typescript"

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, "../src/api/schema.d.ts")
const SOURCE = process.env.OPENAPI_URL ?? "http://localhost/api/openapi.json"
const check = process.argv.includes("--check")

const BANNER = `/**
 * GENERATED FILE — DO NOT EDIT.
 * Regenerate with \`pnpm api:generate\` against a backend running IS_DEBUG=true.
 */

`

async function main() {
  let ast
  try {
    ast = await openapiTS(new URL(SOURCE))
  } catch (cause) {
    throw new Error(
      `Could not read the OpenAPI schema from ${SOURCE}.\n` +
        `Start the backend first (cd infra && docker compose up), or set OPENAPI_URL.`,
      { cause }
    )
  }

  const next = BANNER + astToString(ast)

  if (check) {
    const current = await readFile(OUT, "utf8").catch(() => null)
    if (current !== next) {
      console.error(
        "src/api/schema.d.ts is out of date with the backend schema.\n" +
          "Run `pnpm api:generate` and commit the result."
      )
      process.exit(1)
    }
    console.log("src/api/schema.d.ts is up to date.")
    return
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, next)
  console.log(`Wrote ${OUT}`)
}

await main()
