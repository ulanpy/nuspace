import assert from "node:assert/strict"
import { test } from "node:test"

import { reachable, usedTokens } from "./usage.ts"

/** A virtual project: `/src` is the app, `/wb` is the workbench's own folder. */
const FILES: Record<string, string> = {
  "/wb/button.wb.tsx": `import { Button } from "@/ui/button"
import { demo } from "./button.wb.demo"
export default () => <Button className="rounded-md" />
`,
  "/wb/button.wb.demo.tsx": `export const demo = [{ label: "bg-destructive text-white" }]
`,
  "/src/ui/button.tsx": `import { cn } from "cn"
import { useState } from "react"
export function Button({ className }: { className?: string }) {
  return <button className={cn("bg-primary text-primary-foreground", className)} />
}
`,
  "/src/ui/field.tsx": `export const Field = () => <input className="border-input" />
`,
  "/src/loop-a.ts": `import "./loop-b"
`,
  "/src/loop-b.ts": `import "./loop-a"
`,
}

const TOKENS = [
  { name: "--primary", value: "hsl(217 68% 42%)" },
  { name: "--primary-foreground", value: "hsl(214 81% 98%)" },
  { name: "--destructive", value: "hsl(360 71% 47%)" },
  { name: "--input", value: "hsl(214 22% 78%)" },
  { name: "--radius-md", value: "calc(var(--radius) * 0.8)" },
  // The Tailwind mirror. A class resolves to one of these, and each is an alias
  // of the token a designer thinks in, so a mirror is not optional here.
  { name: "--color-primary", value: "var(--primary)" },
  { name: "--color-primary-foreground", value: "var(--primary-foreground)" },
  { name: "--color-destructive", value: "var(--destructive)" },
  { name: "--color-input", value: "var(--input)" },
]

void test("the walk follows local imports and skips packages", () => {
  const found = reachable(FILES, "/wb/button.wb.tsx", "/src").sort()
  assert.deepEqual(found, [
    "/src/ui/button.tsx",
    "/wb/button.wb.demo.tsx",
    "/wb/button.wb.tsx",
  ])
})

void test("the walk terminates on an import cycle", () => {
  assert.deepEqual(reachable(FILES, "/src/loop-a.ts", "/src").sort(), [
    "/src/loop-a.ts",
    "/src/loop-b.ts",
  ])
})

void test("a component reports the tokens its whole tree uses", () => {
  const { found } = usedTokens(FILES, "/wb/button.wb.tsx", TOKENS, "/src")
  // `rounded-md` is on the entry, `bg-primary` is in the primitive, and
  // `bg-destructive` is in a fixture that is still part of the tree.
  assert.deepEqual([...found.keys()].sort(), [
    "--destructive",
    "--primary",
    "--primary-foreground",
    "--radius-md",
  ])
})

void test("a class reports the token it really points at", () => {
  const { found } = usedTokens(FILES, "/src/ui/field.tsx", TOKENS, "/src")
  // `border-input` is `--color-input`, which is `var(--input)`.
  assert.deepEqual([...found.keys()], ["--input"])
  assert.equal(found.get("--input"), "class")
})

void test("a class the stylesheet does not declare is not reported", () => {
  const { found } = usedTokens(FILES, "/src/ui/button.tsx", TOKENS, "/src")
  // `text-white` and the `cn` and `react` imports name nothing in the file.
  assert.ok(!found.has("--color-white"))
  assert.equal(found.size, 2)
})

void test("an entry that does not exist walks nothing", () => {
  assert.deepEqual(usedTokens(FILES, "/wb/missing.wb.tsx", TOKENS, "/src"), {
    found: new Map(),
  })
})
