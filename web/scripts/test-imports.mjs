import { registerHooks } from "node:module"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const SRC = path.resolve(process.cwd(), "src")
const SRC_URL = pathToFileURL(SRC).href

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const base = path.join(SRC, specifier.slice(2))
      const asFile = base + ".ts"
      if (existsSync(asFile)) {
        return { url: pathToFileURL(asFile).href, shortCircuit: true }
      }
      const asIndex = path.join(base, "index.ts")
      if (existsSync(asIndex)) {
        return { url: pathToFileURL(asIndex).href, shortCircuit: true }
      }
    }
    if (
      specifier.startsWith(".") &&
      context.parentURL?.startsWith(SRC_URL) &&
      !path.extname(specifier)
    ) {
      const target = path.resolve(
        path.dirname(fileURLToPath(context.parentURL)),
        specifier
      )
      if (existsSync(target + ".ts")) {
        return { url: pathToFileURL(target + ".ts").href, shortCircuit: true }
      }
      if (existsSync(target + ".tsx")) {
        return { url: pathToFileURL(target + ".tsx").href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})
