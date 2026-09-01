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
 *
 * openapi-typescript builds its output through the TypeScript compiler's
 * ts.factory AST API, which TypeScript 7 does not expose — importing it under
 * TS 7 throws immediately. Since its output is plain text, the generator runs
 * in an isolated environment pinned to TS 6 rather than the project compiler.
 * Nothing about the emitted .d.ts depends on which version produced it.
 */
import { execFile } from "node:child_process"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, "../src/api/schema.d.ts")
const SOURCE = process.env.OPENAPI_URL ?? "http://localhost/api/openapi.json"
const check = process.argv.includes("--check")

// Pinned so regeneration is reproducible across machines and CI.
const GENERATOR = "openapi-typescript@7.13.0"
const GENERATOR_COMPILER = "typescript@6.0.3"

const BANNER = `/**
 * GENERATED FILE — DO NOT EDIT.
 * Regenerate with \`pnpm api:generate\` from an offline backend OpenAPI export.
 */

`

async function generate() {
  const { stdout } = await execFileAsync(
    "pnpm",
    [
      "dlx",
      "--package",
      GENERATOR_COMPILER,
      "--package",
      GENERATOR,
      "openapi-typescript",
      SOURCE,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  )

  // pnpm dlx prefixes resolution progress on stdout in some versions; keep
  // everything from the generated banner onward.
  const start = stdout.indexOf("/**")
  if (start === -1) {
    throw new Error(
      `Generator produced no schema output:\n${stdout.slice(0, 500)}`
    )
  }
  return BANNER + stdout.slice(start)
}

async function main() {
  let next
  try {
    next = await generate()
  } catch (cause) {
    throw new Error(
      `Could not generate types from ${SOURCE}.\n` +
        `Export the backend schema and set OPENAPI_URL to its path.`,
      { cause }
    )
  }

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
