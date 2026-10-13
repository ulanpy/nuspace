/**
 * Reading the token file as source text rather than through the CSSOM. The
 * stylesheet object model only exposes what the browser resolved, which throws
 * away the enclosing selector and the offset in the file, and both are needed
 * to edit a value in place.
 */

export type Token = {
  /** Including the leading dashes. */
  name: string
  /** Enclosing selector or at-rule. A declaration at the top level belongs to
   * `:root`, so that case is normalised rather than left for callers. */
  block: string
  value: string
  /** Offset of the value in the source, so a patch needs no re-parse. */
  start: number
  end: number
}

const DECLARATION = /(--[\w-]+)\s*:\s*/y

const COLOUR =
  /^#|^rgba?\(|^hsla?\(|^hwb\(|^lab\(|^lch\(|^oklab\(|^oklch\(|^color\(/

export const isColour = (value: string) => COLOUR.test(value.trim())

/**
 * A `var()` reference, which is how Tailwind's `@theme` mirrors the app's own
 * tokens. Changing one moves nothing at runtime, so it is shown rather than
 * offered for editing.
 */
export const isAlias = (value: string) => value.trim().startsWith("var(")

export function parseTokens(source: string): Token[] {
  const tokens: Token[] = []
  const blocks: string[] = []
  let preludeFrom = 0
  let index = 0

  while (index < source.length) {
    const char = source[index]

    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2)
      if (end === -1) break
      index = end + 2
      continue
    }

    if (char === '"' || char === "'") {
      const end = source.indexOf(char, index + 1)
      index = end === -1 ? source.length : end + 1
      continue
    }

    if (char === "{" || char === "}" || char === ";") {
      if (char === "}") blocks.pop()
      // A comment before or inside a selector is not part of its name.
      if (char === "{") {
        blocks.push(
          source
            .slice(preludeFrom, index)
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .trim()
        )
      }
      preludeFrom = index + 1
      index += 1
      continue
    }

    DECLARATION.lastIndex = index
    const match = DECLARATION.exec(source)
    if (!match) {
      index += 1
      continue
    }

    // Functions nest, so a `;` inside `hsl(1 2% 3% / 50%)` or `calc()` does not
    // end the value. Walk to the delimiter at paren depth zero.
    const from = index + match[0].length
    let depth = 0
    let end = from
    while (end < source.length) {
      const current = source[end]
      if (current === '"' || current === "'") {
        const close = source.indexOf(current, end + 1)
        end = close === -1 ? source.length : close + 1
        continue
      }
      if (current === "(") depth += 1
      else if (current === ")") depth -= 1
      else if (depth === 0 && (current === ";" || current === "}")) break
      end += 1
    }

    tokens.push({
      name: match[1],
      block: blocks.join(" ") || ":root",
      value: source.slice(from, end).trim(),
      start: from,
      end,
    })
    preludeFrom = end
    index = end
  }

  return tokens
}

/** Highest offset first, so an earlier edit cannot move a later one's offsets. */
export function patch(
  source: string,
  edits: readonly Pick<Token, "start" | "end" | "value">[]
) {
  let out = source
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, edit.start) + edit.value + out.slice(edit.end)
  }
  return out
}

/**
 * Everything unsaved, and the one text it adds up to. The count is the number of
 * edits rather than a number of rows, so the button and the file it writes cannot
 * disagree about how much is pending.
 *
 * Nothing is added or removed here: the file is edited beside this, not by it. A
 * declaration the file no longer has is left for the author to take out.
 */
export function patchPlan(
  source: string,
  tokens: Token[],
  valueOf: (token: Token) => string
): { css: string; edits: number } {
  const edits: { start: number; end: number; value: string }[] = []

  for (const token of tokens) {
    const value = valueOf(token)
    if (value !== token.value) edits.push({ ...token, value })
  }

  return { css: patch(source, edits), edits: edits.length }
}

/** The custom property an alias points at, or null if it is not an alias. */
export function aliasTarget(value: string) {
  if (!isAlias(value)) return null
  return /^var\(\s*(--[\w-]+)/.exec(value.trim())?.[1] ?? null
}

/**
 * Tokens repeat a name across blocks, so the block is part of the identity. The
 * overrides map is keyed by this, and `unkey` reads it back when a stylesheet
 * has to be built from it.
 */
export const keyOf = (token: Token) => `${token.block}\n${token.name}`

export const unkey = (key: string) => {
  const at = key.indexOf("\n")
  return { block: key.slice(0, at), name: key.slice(at + 1) }
}

/** Every custom property a value reads, however deeply it is nested. */
export function references(value: string): string[] {
  const found: string[] = []
  for (const match of value.matchAll(/var\(\s*(--[\w-]+)/g))
    if (!found.includes(match[1])) found.push(match[1])
  return found
}

/**
 * The custom property a value is built on, whether the value is nothing but a
 * reference or only contains one: `var(--primary)` and `calc(var(--radius) * 0.6)`
 * are both dependent, and both should say so.
 */
export function referenceOf(value: string) {
  return references(value)[0] ?? null
}

/**
 * The declaration of a name that is actually in effect: the block that asks for
 * it, then the block the preview is in, then the first one the file has.
 *
 * Forty tokens are declared in both `:root` and `.dark`. Resolving by name alone
 * always answers `:root`, which is the light palette whatever is on screen, so a
 * reference link opens a value nobody is looking at and a component's panel shows
 * the light swatches in dark mode.
 */
export function resolveToken(
  name: string,
  block: string | undefined,
  tokens: Token[],
  active?: string
): Token | undefined {
  const inBlock = (wanted: string) =>
    tokens.find((token) => token.name === name && token.block === wanted)

  return (
    (block === undefined ? undefined : inBlock(block)) ??
    (active ? inBlock(active) : undefined) ??
    tokens.find((token) => token.name === name)
  )
}

/**
 * The tokens a value resolves through, ending at the one that holds a real value.
 * `--radius-sm` is a calculation of `--radius`, which is an alias of
 * `--radius-panel`, so editing the panel moves the whole radius scale.
 */
export function chain(token: Token, tokens: Token[], active?: string): Token[] {
  const walked: Token[] = []
  let cursor: Token | undefined = token

  while (cursor) {
    const reference = referenceOf(cursor.value)
    const next: Token | undefined = reference
      ? resolveToken(reference, cursor.block, tokens, active)
      : undefined
    if (!next || walked.includes(next)) break
    walked.push(next)
    cursor = next
  }

  return walked
}

/** Every token whose value reads a name, whatever block either of them sits in. */
export function readersOf(name: string, tokens: Token[]): Token[] {
  return tokens.filter((token) => references(token.value).includes(name))
}

/**
 * Type categories, in the order they are offered. The value decides first,
 * because nuspace's tokens carry no prefix and only the value says whether one
 * is a colour. Name patterns match the bare name, without the `--`.
 */
export const CATEGORIES = [
  {
    id: "color",
    label: "Color",
    test: (name: string, value: string) =>
      isColour(value) || /^(color|colour|palette)-/.test(name),
  },
  {
    id: "radius",
    label: "Radius",
    test: (name: string) => /^radius/.test(name),
  },
  {
    id: "spacing",
    label: "Spacing",
    test: (name: string) => /^(spacing|space|gap)-/.test(name),
  },
  {
    id: "typography",
    label: "Typography",
    test: (name: string) =>
      /^(font|text|leading|line-height|letter-spacing)-/.test(name),
  },
  {
    id: "motion",
    label: "Motion",
    test: (name: string) =>
      /^(duration|animate|ease|easing|transition)-/.test(name),
  },
  {
    id: "shadow",
    label: "Shadow",
    test: (name: string) => /^(shadow|elevation)-/.test(name),
  },
] as const

const OTHER = { id: "other", label: "Other" }

export function categoryOf(token: Token) {
  const name = token.name.replace(/^--/, "")
  return (
    CATEGORIES.find((category) => category.test(name, token.value))?.id ??
    OTHER.id
  )
}

export const categoryLabel = (id: string) =>
  CATEGORIES.find((category) => category.id === id)?.label ?? OTHER.label

/** Every type a token can be given, in the order they are offered. */
export const TYPES: readonly { id: string; label: string }[] = [
  ...CATEGORIES.map(({ id, label }) => ({ id, label })),
  OTHER,
]

/** The block the dark theme declares in, which the sheet names a few places. */
export const DARK_BLOCK = ".dark"

export type Section = {
  id: string
  category: string
  label: string
  hint: string
  tokens: Token[]
}

/**
 * The file cut into the groups a reader scans by: the category, then the block
 * that declares it, because 40 tokens exist in both `:root` and `.dark`. An
 * alias is a mirror of another token, so it gets one section at the end rather
 * than dead rows in the middle of the palette. The `calc(var(--radius) * n)`
 * tokens stay in Radius: they have a real slider.
 *
 * The type of a token is read off its value, which is right for a file nobody has
 * touched. A caller that has been told otherwise, because the author picked the
 * type, passes that instead.
 */
export function buildSections(
  tokens: Token[],
  typeOf: (token: Token) => string = categoryOf
): Section[] {
  const real = tokens.filter((token) => !isAlias(token.value))
  const mirror = tokens.filter((token) => isAlias(token.value))
  const sections: Section[] = []

  for (const { id: category } of TYPES) {
    const inCategory = real.filter((token) => typeOf(token) === category)
    if (inCategory.length === 0) continue

    for (const block of [...new Set(inCategory.map((token) => token.block))]) {
      sections.push({
        // A fragment with a space or a colon in it never matches, so the id is
        // slugged. The block stays on the section heading.
        id: `${category}-${block}`.replace(/[^a-z0-9]+/gi, "-"),
        category,
        label: categoryLabel(category),
        hint:
          block === DARK_BLOCK ? "dark" : block === ":root" ? "root" : "theme",
        tokens: inCategory.filter((token) => token.block === block),
      })
    }
  }

  sections.push({
    id: "mirror",
    category: "mirror",
    label: "Mirror",
    hint: "Tailwind aliases",
    tokens: mirror,
  })

  return sections
}

/**
 * A list of tokens plus everything connected to them in either direction: what
 * each value resolves through, and every token that reads them. A component's
 * panel is where a change lands, so it carries the dependency, without which a
 * slider means nothing, and the readers, without which the links the editor
 * offers have nowhere to go.
 *
 * The second argument is the whole file, because a name is only resolvable
 * against everything that declares it. Keyed by declaration, so a name that
 * exists in both `:root` and `.dark` is still one row each.
 */
export function withRelated(
  tokens: Token[],
  all: Token[],
  active?: string
): Token[] {
  const direct = tokens.flatMap((token) => [
    token,
    ...chain(token, all, active),
  ])
  const names = new Set(direct.map((token) => token.name))

  const seen = new Set<string>()
  const out: Token[] = []
  const push = (token: Token) => {
    const key = keyOf(token)
    if (seen.has(key)) return
    seen.add(key)
    out.push(token)
  }

  for (const token of direct) push(token)
  // Readers come after, in the order the file declares them, so the panel reads
  // like the file does. One hop only: a reader of a reader is a step further than
  // the editor's own "read by" offers.
  for (const reader of all)
    if (references(reader.value).some((name) => names.has(name))) push(reader)

  return out
}
