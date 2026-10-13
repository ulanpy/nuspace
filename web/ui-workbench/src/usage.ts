import { isAlias, aliasTarget } from "./tokens.ts"
import { tokenFromClass } from "./values.ts"

export type Sources = Readonly<Record<string, string>>

type Token = { name: string; value: string }

/**
 * Every file a module pulls in, following only imports it can resolve to a
 * source file. A component's own file says almost nothing about it, its
 * primitives say everything, so the answer is only worth having with the walk.
 *
 * Keys are the paths `import.meta.glob` produced. `aliasBase` is what `@/` means
 * in the same namespace: a project layout is the caller's business, not this
 * module's.
 */
export function reachable(
  files: Sources,
  entry: string,
  aliasBase: string
): string[] {
  const byBasename = new Map(
    Object.keys(files).map((path) => [stripExtension(path), path])
  )

  const resolve = (from: string, specifier: string) => {
    if (specifier.startsWith("@/"))
      return byBasename.get(join(aliasBase, specifier.slice(2)))
    if (!specifier.startsWith(".")) return null

    const dir = from.slice(0, from.lastIndexOf("/"))
    const joined = join(dir, specifier)
    return byBasename.get(joined) ?? byBasename.get(`${joined}/index`)
  }

  const seen = new Set<string>()
  const queue = [entry]

  while (queue.length > 0) {
    const path = queue.pop()!
    const source = files[path]
    if (source === undefined || seen.has(path)) continue
    seen.add(path)

    for (const match of source.matchAll(
      /(?:from|import)\s*\(?\s*["']([^"']+)["']/g
    )) {
      const hit = resolve(path, match[1])
      if (hit) queue.push(hit)
    }
  }

  return [...seen]
}

const stripExtension = (path: string) => path.replace(/\.tsx?$/, "")

/** `a/./b/../c` is `a/c`. A leading `/` and a leading `..` both survive. */
function join(dir: string, relative: string) {
  const path = `${dir}/${relative}`
  const absolute = path.startsWith("/")
  const out: string[] = []

  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue
    if (part === "..") {
      if (out.length > 0 && out.at(-1) !== "..") out.pop()
      else out.push("..")
      continue
    }
    out.push(part)
  }

  return absolute ? `/${out.join("/")}` : out.join("/")
}

/**
 * A class resolves to a theme variable, and most of those are aliases of the
 * token a designer thinks in: `text-muted-foreground` is
 * `--color-muted-foreground`, which is `var(--muted-foreground)`. Report the real
 * token, or the editor sends you to edit a mirror.
 */
function realName(name: string, aliases: ReadonlyMap<string, string>) {
  let current = name
  for (let hop = 0; hop < 4; hop++) {
    const target = aliases.get(current)
    if (!target) break
    current = target
  }
  return current
}

export type Usage = { found: Map<string, "var" | "class"> }

/**
 * Which tokens a component uses. Two routes in: a `var(--x)` reference, or a
 * Tailwind class, which only counts when the stylesheet declares the theme
 * variable behind it. That check is what keeps `text-sm` and `font-medium` out,
 * since they read like colours and families and are neither.
 */
export function usedTokens(
  files: Sources,
  entry: string,
  tokens: readonly Token[],
  aliasBase: string
): Usage {
  const names = new Set(tokens.map((token) => token.name))
  const aliases = new Map(
    tokens
      .filter((token) => isAlias(token.value))
      .map((token) => [token.name, aliasTarget(token.value) ?? ""])
  )
  const found = new Map<string, "var" | "class">()

  const walked = reachable(files, entry, aliasBase)

  for (const path of walked) {
    const source = files[path]

    for (const match of source.matchAll(/var\(\s*(--[\w-]+)/g))
      if (names.has(match[1])) found.set(realName(match[1], aliases), "var")

    for (const word of source.split(/[\s"'`,;{}()[\]]+/)) {
      const name = tokenFromClass(word, names)
      if (!name) continue
      const real = realName(name, aliases)
      if (!found.has(real)) found.set(real, "class")
    }
  }

  return { found }
}
