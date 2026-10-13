import assert from "node:assert/strict"
import { test } from "node:test"

import {
  aliasTarget,
  buildSections,
  categoryOf,
  chain,
  isColour,
  keyOf,
  parseTokens,
  patch,
  patchPlan,
  references,
  referenceOf,
  resolveToken,
  withRelated,
} from "./tokens.ts"
import type { Token } from "./tokens.ts"

const SOURCE = `/* --commented: hsl(0 0% 0%); */
:root {
  --primary: hsl(215 87% 71%);
  --radius-sm: calc(var(--radius) * 0.6);
  --font-sans: "Onest Variable", -apple-system, sans-serif;
}

.dark {
  --primary: hsl(215 87% 21%);
}

@theme inline {
  --font-heading: var(--font-sans);
}

.nuspace-richtext p {
  --leading: 1.75;
}

:root { --top-level: red; }
`

void test("reads declarations with their enclosing block", () => {
  const found = parseTokens(SOURCE)
  assert.deepEqual(
    found.map((token) => [token.name, token.block, token.value]),
    [
      ["--primary", ":root", "hsl(215 87% 71%)"],
      ["--radius-sm", ":root", "calc(var(--radius) * 0.6)"],
      ["--font-sans", ":root", '"Onest Variable", -apple-system, sans-serif'],
      ["--primary", ".dark", "hsl(215 87% 21%)"],
      ["--font-heading", "@theme inline", "var(--font-sans)"],
      ["--leading", ".nuspace-richtext p", "1.75"],
      ["--top-level", ":root", "red"],
    ]
  )
})

void test("skips comments", () => {
  assert.equal(
    parseTokens(SOURCE).some((token) => token.value.includes("0 0% 0%")),
    false
  )
})

void test("a value survives braces inside a string", () => {
  const found = parseTokens(`:root { --content: "}"; --next: 1px; }`)
  assert.equal(found.length, 2)
  assert.equal(found[0].value, '"}"')
  assert.equal(found[1].value, "1px")
})

void test("patching one value leaves the rest of the file byte-identical", () => {
  const target = parseTokens(SOURCE).find(
    (token) => token.value === "hsl(215 87% 21%)"
  )
  assert.ok(target)
  const patched = patch(SOURCE, [{ ...target, value: "oklch(0.2 0.1 250)" }])
  assert.equal(
    patched,
    SOURCE.replace("hsl(215 87% 21%)", "oklch(0.2 0.1 250)")
  )
})

void test("patching several values at once", () => {
  const edits = parseTokens(SOURCE)
    .filter((token) => token.name === "--primary")
    .map((token) => ({ ...token, value: "red" }))
  const patched = patch(SOURCE, edits)
  assert.equal((patched.match(/--primary: red/g) ?? []).length, 2)
  assert.equal(patched.includes("hsl(215 87% 71%)"), false)
})

void test("the plan writes the values that changed and leaves the rest alone", () => {
  const tokens = parseTokens(NUSPACE)
  const primary = tokens.find(
    (token) => token.name === "--primary" && token.block === ":root"
  )!

  const plan = patchPlan(NUSPACE, tokens, (token) =>
    token === primary ? "red" : token.value
  )

  assert.equal(plan.edits, 1)
  assert.equal(plan.css.includes("  --primary: red;"), true)
  // The other declaration of the same name is a different token, and it is left
  // as the file has it.
  assert.equal((plan.css.match(/--primary: red/g) ?? []).length, 1)

  // The result is a stylesheet the parser reads back, the same list of tokens
  // with that one value changed.
  const after = parseTokens(plan.css).map((token) => [token.name, token.value])
  assert.equal(after[0][0], "--primary")
  assert.deepEqual(
    after,
    parseTokens(NUSPACE).map((token, index) => [
      token.name,
      index === 0 ? "red" : token.value,
    ])
  )
})

void test("the plan changes nothing when no value has changed", () => {
  const tokens = parseTokens(NUSPACE)
  const plan = patchPlan(NUSPACE, tokens, (token) => token.value)

  assert.equal(plan.edits, 0)
  assert.equal(plan.css, NUSPACE)
})

void test("colour values are recognised, lengths and stacks are not", () => {
  assert.equal(isColour("hsl(215 87% 71%)"), true)
  assert.equal(isColour("#4f46e5"), true)
  assert.equal(isColour("oklch(0.2 0.1 250)"), true)
  assert.equal(isColour("0.5rem"), false)
  assert.equal(isColour("var(--primary)"), false)
  assert.equal(isColour('"Onest Variable", sans-serif'), false)
})

const NUSPACE = `:root {
  --primary: hsl(217 68% 42%);
  --radius: var(--radius-panel);
  --radius-panel: 0.75rem;
  --radius-lg: var(--radius);
}
.dark { --primary: hsl(215 87% 70%); }
@theme inline {
  --color-primary: var(--primary);
  --font-sans: "Onest Variable", sans-serif;
  --animate-accordion-down: accordion-down 0.2s ease-out;
  --duration-fast: 180ms;
}`

void test("categories come from the value where the name is silent", () => {
  const byName = new Map(parseTokens(NUSPACE).map((t) => [t.name, t]))

  assert.equal(categoryOf(byName.get("--primary")!), "color")
  assert.equal(categoryOf(byName.get("--color-primary")!), "color")
  assert.equal(categoryOf(byName.get("--font-sans")!), "typography")
  assert.equal(categoryOf(byName.get("--radius-panel")!), "radius")
  assert.equal(categoryOf(byName.get("--duration-fast")!), "motion")
  assert.equal(categoryOf(byName.get("--animate-accordion-down")!), "motion")
})

void test("aliasTarget reads the referenced name", () => {
  assert.equal(aliasTarget("var(--primary)"), "--primary")
  assert.equal(aliasTarget("  var( --primary )"), "--primary")
  assert.equal(aliasTarget("hsl(0 0% 0%)"), null)
  assert.equal(aliasTarget("var(--missing, red)"), "--missing")
})

void test("a value depends on a token whether it is an alias or a calculation", () => {
  assert.equal(referenceOf("var(--primary)"), "--primary")
  // A radius built from another radius is editable but not independent.
  assert.equal(referenceOf("calc(var(--radius) * 0.6)"), "--radius")
  assert.equal(referenceOf("0.75rem"), null)
  assert.equal(referenceOf("hsl(214 80.7% 98.4%)"), null)
})

void test("a chain crosses from a theme alias to the token a designer changes", () => {
  const tokens = parseTokens(NUSPACE)
  const pick = (name: string) => tokens.find((token) => token.name === name)!

  assert.deepEqual(
    chain(pick("--color-primary"), tokens).map((token) => token.name),
    ["--primary"]
  )
  assert.deepEqual(
    chain(pick("--radius-lg"), tokens).map((token) => token.name),
    ["--radius", "--radius-panel"]
  )
})

void test("every custom property in a value is found, not just the first", () => {
  assert.deepEqual(references("calc(var(--a) * var(--b))"), ["--a", "--b"])
  assert.deepEqual(references('"Onest, Variable"'), [])
  assert.deepEqual(references("var(--a) var(--a)"), ["--a"])
})

void test("a chain walks to the token that holds a real value", () => {
  const tokens = parseTokens(SOURCE)
  assert.deepEqual(
    chain(
      tokens.find((t) => t.name === "--radius-sm")!,
      tokens
    ).map((token) => token.name),
    // --radius is declared later in the same block and is itself an alias.
    []
  )

  const nested = parseTokens(`:root {
  --radius: var(--radius-panel);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-panel: 0.75rem;
}`)
  const pick = (name: string) => nested.find((t) => t.name === name)!
  assert.deepEqual(
    chain(pick("--radius-sm"), nested).map((token) => token.name),
    ["--radius", "--radius-panel"]
  )
  assert.deepEqual(chain(pick("--radius-panel"), nested), [])
})

void test("a reference resolves in its own block, not in the last one written", () => {
  const tokens = parseTokens(`:root {
  --radius-panel: 0.75rem;
  --radius: var(--radius-panel);
}
.dark {
  --radius-panel: 1rem;
  --radius: var(--radius-panel);
}`)
  const pick = (block: string, name: string) =>
    tokens.find((t) => t.block === block && t.name === name)!

  // Both blocks declare the name, so each radius reads the one beside it. Resolving
  // by name alone sends both links to `.dark`, which is the wrong declaration.
  assert.deepEqual(
    chain(pick(":root", "--radius"), tokens).map((t) => t.block),
    [":root"]
  )
  assert.deepEqual(
    chain(pick(".dark", "--radius"), tokens).map((t) => t.block),
    [".dark"]
  )

  // A block that does not declare the name falls back to the first one the file
  // has, which is the light value.
  const themed = parseTokens(`:root { --border: hsl(214 22% 78%); }
.dark { --border: hsl(214 24% 24%); }
@theme inline { --color-border: var(--border); }`)
  assert.deepEqual(
    chain(themed.at(-1)!, themed).map((t) => t.block),
    [":root"]
  )
})

void test("a reference follows the block the browser is reading", () => {
  const tokens = parseTokens(`:root {
  --border: hsl(214 22% 78%);
  --ring: var(--border);
}
.dark {
  --border: hsl(214 24% 24%);
  --ring: var(--border);
}
@theme inline {
  --color-border: var(--border);
}`)
  const mirror = tokens.at(-1)!
  const light = tokens[1]

  // `@theme` declares neither, so the link follows the theme on screen: the light
  // declaration normally, the dark one in dark mode. That is the value actually
  // painted, so it is the one worth opening.
  assert.deepEqual(
    chain(mirror, tokens).map((t) => t.block),
    [":root"]
  )
  assert.deepEqual(
    chain(mirror, tokens, ".dark").map((t) => t.block),
    [".dark"]
  )

  // A token's own block wins either way: selecting the light `--ring` means the
  // light one, dark preview or not.
  assert.deepEqual(
    chain(light, tokens, ".dark").map((t) => t.block),
    [":root"]
  )

  // With no block to start from, the preview decides. This is what a component's
  // panel asks, since the walk reports a name and not a block.
  assert.equal(resolveToken("--border", undefined, tokens)?.block, ":root")
  assert.equal(
    resolveToken("--border", undefined, tokens, ".dark")?.block,
    ".dark"
  )
  assert.equal(resolveToken("--ring", "@theme inline", tokens)?.block, ":root")
})

void test("a chain stops at a cycle instead of hanging", () => {
  const tokens = parseTokens(":root { --a: var(--b); --b: var(--a); }")
  const walked = chain(tokens[0], tokens).map((token) => token.name)
  // A cycle has no end, so the answer is arbitrary. What matters is that it
  // terminates and never names the same token twice.
  assert.equal(new Set(walked).size, walked.length)
  assert.ok(walked.includes("--b"))
})

void test("a list of tokens gains what they resolve through and what reads them", () => {
  const tokens = parseTokens(NUSPACE)
  const pick = (name: string) => tokens.find((token) => token.name === name)!

  // `--radius-lg` is a calculated alias of `--radius`, which is an alias of
  // `--radius-panel`, so both come with it. `--color-primary` reads `--primary`,
  // which is the token the editor names as that mirror's reader, so it comes too.
  assert.deepEqual(
    withRelated([pick("--radius-lg"), pick("--primary")], tokens).map(
      (token) => token.name
    ),
    [
      "--radius-lg",
      "--radius",
      "--radius-panel",
      "--primary",
      "--color-primary",
    ]
  )
})

void test("a token that two others depend on is listed once", () => {
  const tokens = parseTokens(NUSPACE)
  const pick = (name: string) => tokens.find((token) => token.name === name)!

  const found = withRelated(
    [pick("--radius-lg"), pick("--radius-lg"), pick("--radius")],
    tokens
  )

  assert.deepEqual(
    found.map((token) => keyOf(token)),
    [
      keyOf(pick("--radius-lg")),
      keyOf(pick("--radius")),
      keyOf(pick("--radius-panel")),
    ]
  )
})

void test("sections follow the category, then the block that declares them", () => {
  const sections = buildSections(parseTokens(NUSPACE))

  assert.deepEqual(
    sections.map((section) => [
      section.category,
      section.label,
      section.hint,
      section.tokens.map((token) => token.name),
    ]),
    [
      ["color", "Color", "root", ["--primary"]],
      // The same name in two blocks is two declarations, so two rows.
      ["color", "Color", "dark", ["--primary"]],
      ["radius", "Radius", "root", ["--radius-panel"]],
      ["typography", "Typography", "theme", ["--font-sans"]],
      [
        "motion",
        "Motion",
        "theme",
        ["--animate-accordion-down", "--duration-fast"],
      ],
      // A value that is only a reference to another token, whether that is a
      // Tailwind mirror or a step in the radius scale, in the order the file
      // declares them.
      [
        "mirror",
        "Mirror",
        "Tailwind aliases",
        ["--radius", "--radius-lg", "--color-primary"],
      ],
    ]
  )
})

void test("a token's type can be decided rather than read off its value", () => {
  const tokens = parseTokens(NUSPACE)
  const asSpacing = (token: Token) =>
    token.name === "--radius-panel" ? "spacing" : categoryOf(token)

  // `--radius-panel` holds a length, so it reads as a radius. A caller that says
  // it is a spacing token gets a group that says so.
  const sections = buildSections(tokens, asSpacing)

  assert.deepEqual(
    sections.flatMap((section) =>
      section.tokens
        .filter((token) => token.name === "--radius-panel")
        .map(() => [section.category, section.label])
    ),
    [["spacing", "Spacing"]]
  )
})
