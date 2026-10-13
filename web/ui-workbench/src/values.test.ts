import assert from "node:assert/strict"
import { test } from "node:test"

import {
  convert,
  cubicBezierOf,
  defaultFor,
  detectNotation,
  durationOf,
  easingOf,
  formatDuration,
  formatEasing,
  formatFunction,
  hexToHsl,
  hexToRgb,
  joinParts,
  luminance,
  motionOption,
  motionText,
  MOTION_OPTIONS,
  partLabel,
  radiusOf,
  radiusText,
  splitParts,
  tokenFromClass,
} from "./values.ts"
import { TYPES } from "./tokens.ts"

void test("an easing can be named or spelled out, and reads the same either way", () => {
  assert.deepEqual(easingOf("cubic-bezier(0.16, 1, 0.3, 1)"), {
    name: "cubic-bezier",
    args: [0.16, 1, 0.3, 1],
  })
  // A keyword is a curve the browser already knows, so the editor shows it as the
  // numbers it stands for and can write it back unchanged.
  assert.deepEqual(easingOf("ease-out"), {
    name: "ease-out",
    args: [0, 0, 0.58, 1],
  })
  assert.equal(easingOf("180ms"), null)
})

void test("choosing a timing function writes either the keyword or the curve", () => {
  assert.equal(formatEasing("ease-in", [0.16, 1, 0.3, 1]), "ease-in")
  assert.equal(
    formatEasing("cubic-bezier", [0.16, 1, 0.3, 1]),
    "cubic-bezier(0.16, 1, 0.3, 1)"
  )
})

void test("a motion value can be written as any shape the list offers", () => {
  // The list is the field's whole vocabulary, so each entry has to write
  // something, and something the field can show back.
  for (const option of MOTION_OPTIONS) {
    assert.notEqual(motionText(option), "")
    assert.equal(motionOption(motionText(option)), option)
  }

  assert.equal(motionText("ms"), "180ms")
  // Seconds are the same duration, not a new guess at one.
  assert.equal(motionText("s"), "0.18s")
  assert.equal(motionText("ease-out"), "ease-out")
  assert.equal(motionText("linear"), "linear")
  assert.equal(motionText("cubic-bezier"), "cubic-bezier(0, 0, 0.58, 1)")
})

void test("changing a shape keeps what it can and only invents what it must", () => {
  // The author's own length, in the other unit. 220ms is not the default.
  assert.equal(motionText("s", "220ms"), "0.22s")
  assert.equal(motionText("ms", "0.22s"), "220ms")

  // The author's own numbers, spelled out.
  assert.equal(
    motionText("cubic-bezier", "cubic-bezier(0.16, 1, 0.3, 1)"),
    "cubic-bezier(0.16, 1, 0.3, 1)"
  )
  // A keyword becoming the curve it stands for.
  assert.equal(
    motionText("cubic-bezier", "ease-out"),
    "cubic-bezier(0, 0, 0.58, 1)"
  )
  // A duration has no numbers to become a curve with, so it starts from one.
  assert.equal(
    motionText("cubic-bezier", "220ms"),
    "cubic-bezier(0, 0, 0.58, 1)"
  )
})

void test("the dropdown answers with the shape, not with the default's own text", () => {
  // Two of the three motion tokens in a real stylesheet are not the default.
  assert.equal(motionOption("220ms"), "ms")
  assert.equal(motionOption("0.18s"), "s")
  assert.equal(motionOption("cubic-bezier(0.16, 1, 0.3, 1)"), "cubic-bezier")
  assert.equal(motionOption("ease-in-out"), "ease-in-out")
  // Nothing a shape could be said about.
  assert.equal(motionOption("accordion-down 0.2s ease-out"), "")
})

void test("each part of a composite value is named by what the value is", () => {
  assert.deepEqual(
    [0, 1, 2].map((at) => partLabel("motion", at)),
    ["name", "duration", "easing"]
  )
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((at) => partLabel("shadow", at)),
    ["x", "y", "blur", "spread", "colour"]
  )
  assert.equal(partLabel("typography", 0), "family")
  assert.equal(partLabel("typography", 2), "family 3")

  // A type with no names of its own is not given another type's names, which is
  // what a missing guard here did: a font stack labelled `x`, `y`, `blur`.
  assert.equal(partLabel("font", 0), "part")
  assert.equal(partLabel("font", 1), "part 2")
  assert.equal(partLabel("other", 0), "part")
})

void test("every type has a default value of its own, and one its control can read", () => {
  // A category id with no default of its own falls back, which would leave a
  // mistyped type looking like it had been given one.
  for (const { id } of TYPES)
    if (id !== "other") assert.notEqual(defaultFor(id), defaultFor("other"))

  // What each type offers needs something it can drive: a picker for a colour, a
  // slider for a radius or a space, a unit for a duration, a row per family for a
  // stack.
  assert.equal(detectNotation(defaultFor("color")), "hsl")
  assert.notEqual(radiusOf(defaultFor("radius")), null)
  assert.notEqual(radiusOf(defaultFor("spacing")), null)
  assert.notEqual(durationOf(defaultFor("motion")), null)
  assert.ok(splitParts(defaultFor("typography")).parts.length > 1)
})

void test("a font stack splits on its commas", () => {
  assert.deepEqual(
    splitParts(
      '"Onest Variable", -apple-system, BlinkMacSystemFont, sans-serif'
    ),
    {
      parts: [
        '"Onest Variable"',
        "-apple-system",
        "BlinkMacSystemFont",
        "sans-serif",
      ],
      separator: ", ",
    }
  )
})

void test("an animation shorthand splits on its spaces", () => {
  assert.deepEqual(splitParts("accordion-down 0.2s ease-out"), {
    parts: ["accordion-down", "0.2s", "ease-out"],
    separator: " ",
  })
})

void test("a value that cannot be divided stays one part", () => {
  for (const value of [
    "0.75rem",
    "hsl(214 80.7% 98.4%)",
    "cubic-bezier(0.16, 1, 0.3, 1)",
    "var(--radius)",
    "calc(var(--radius) * 0.6)",
    "1",
  ]) {
    assert.deepEqual(splitParts(value).parts, [value], value)
  }
})

void test("a quoted family keeps its space", () => {
  assert.deepEqual(splitParts('"Segoe UI", sans-serif').parts, [
    '"Segoe UI"',
    "sans-serif",
  ])
})

void test("parts join back to the value they came from", () => {
  for (const value of ['"Onest Variable", sans-serif', "a 0.2s ease-out"]) {
    const { parts, separator } = splitParts(value)
    assert.equal(joinParts(parts, separator), value)
  }
})

void test("an empty part contributes nothing but does not lose the others", () => {
  const { parts, separator } = splitParts('"Onest", sans-serif')

  // A row the user has just added is empty. It has no value yet, so the value
  // it produces is the value without it, and the row itself lives in the field's
  // own state until something is typed.
  const added = [...parts, ""]
  assert.equal(added.length, 3)
  assert.equal(joinParts(added, separator), '"Onest", sans-serif')

  const typed = [...added]
  typed[2] = "serif"
  assert.equal(joinParts(typed, separator), '"Onest", sans-serif, serif')

  const removed = parts.filter((_, index) => index !== 0)
  assert.equal(joinParts(removed, separator), "sans-serif")
})

void test("the notation a value is written in is readable", () => {
  assert.equal(detectNotation("#f8fafc"), "hex")
  assert.equal(detectNotation("rgb(248 250 252)"), "rgb")
  assert.equal(detectNotation("hsl(214 80.7% 98.4%)"), "hsl")
  assert.equal(detectNotation("0.75rem"), null)
  assert.equal(detectNotation("var(--primary)"), null)
})

void test("hex converts to the notations the picker writes", () => {
  assert.equal(hexToRgb("#f8fafc"), "rgb(248 250 252)")
  assert.equal(hexToHsl("#ff0000"), "hsl(0 100% 50%)")
  assert.equal(hexToHsl("#ffffff"), "hsl(0 0% 100%)")
})

void test("a converted colour carries no float noise", () => {
  // The hue is where the noise shows: an exact hue out of three 8-bit channels is
  // usually not a whole number, and `24.581497797356803` in a stylesheet is a
  // number nobody chose.
  const hsl = hexToHsl("#3b82f6")
  const numbers = hsl.match(/[\d.]+/g) ?? []

  assert.ok(numbers.length > 0)
  for (const number of numbers) {
    const decimals = number.split(".")[1] ?? ""
    assert.ok(decimals.length <= 1, `${number} is longer than one decimal`)
  }

  // Still the same colour after rounding, which is the part that matters.
  assert.equal(hexToRgb(hexToHslBackToHex(hsl)), "rgb(59 130 246)")
})

/** The picker only ever goes hex to hsl and back, so round-trip through it. */
const hexToHslBackToHex = (hsl: string) => {
  const [hue, sat, light] = hsl.match(/[\d.]+/g)!.map(Number)
  // Through the browser would be exact; the check is the colour, so approximate
  // the round trip with the same arithmetic the value came from.
  return hslToHexApprox(hue, sat, light)
}

function hslToHexApprox(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

void test("a radius written by the slider keeps its own precision", () => {
  // The step is 0.02, and float arithmetic on a number of that shape drifts.
  assert.equal(radiusText({ kind: "len", n: 0.6, unit: "rem" }), "0.6rem")
  assert.equal(
    radiusText({ kind: "mult", n: 0.30000000000000004, base: "--radius" }),
    "calc(var(--radius) * 0.3)"
  )
})

void test("a grey has no hue to speak of", () => {
  assert.equal(hexToHsl("#000000"), "hsl(0 0% 0%)")
})

void test("a value keeps the notation it was already in", () => {
  const hsl = "hsl(214 80.7% 98.4%)"
  assert.equal(convert(hsl, "hsl", "#f8fafc"), hsl)
  // An alias has no colour of its own, so a picker must not rewrite it.
  assert.equal(convert("var(--primary)", "hex", null), "var(--primary)")
})

void test("a colour with alpha has no single hex, so it is left alone", () => {
  const alpha = "rgb(34 89 179 / 50%)"
  assert.equal(convert(alpha, "hex", null), alpha)
})

void test("luminance says which label colour is readable", () => {
  assert.ok(luminance("#ffffff") > 0.9)
  assert.ok(luminance("#000000") < 0.05)
  // The middle of the ramp is the awkward case, and it has to be decidable.
  assert.ok(luminance("#2259b3") < 0.5)
})

void test("a radius is either a length or a multiplier of another token", () => {
  assert.deepEqual(radiusOf("0.75rem"), {
    kind: "len",
    n: 0.75,
    unit: "rem",
  })
  assert.deepEqual(radiusOf("calc(var(--radius) * 1.4)"), {
    kind: "mult",
    n: 1.4,
    base: "--radius",
  })
  // A radius large enough to be a circle is still a radius.
  assert.deepEqual(radiusOf("9999px"), { kind: "len", n: 9999, unit: "px" })
  assert.equal(radiusOf("50%"), null)
  assert.equal(radiusOf("var(--radius)"), null)
})

void test("a duration can be written in the other unit", () => {
  assert.equal(formatDuration(180, "ms", "s"), "0.18s")
  // Whole milliseconds stay whole: 0.18s back again is 180ms, not 179.9ms.
  assert.equal(formatDuration(0.18, "s", "ms"), "180ms")
  assert.equal(formatDuration(180, "ms", "ms"), "180ms")
})

void test("a cubic bezier exposes its four numbers", () => {
  assert.deepEqual(cubicBezierOf("cubic-bezier(0.16, 1, 0.3, 1)"), {
    name: "cubic-bezier",
    args: [0.16, 1, 0.3, 1],
  })
  assert.equal(cubicBezierOf("ease-out"), null)
  assert.equal(cubicBezierOf("hsl(214 80.7% 98.4%)"), null)
})

void test("a function writes back the text it was parsed from", () => {
  assert.equal(
    formatFunction("cubic-bezier", [0.16, 1, 0.3, 1]),
    "cubic-bezier(0.16, 1, 0.3, 1)"
  )
})

void test("a class resolves to the token the stylesheet declares", () => {
  const names = new Set([
    "--color-primary",
    "--radius-md",
    "--font-sans",
    "--animate-accordion-down",
    "--ease-campus-snap",
  ])
  assert.equal(tokenFromClass("bg-primary", names), "--color-primary")
  assert.equal(tokenFromClass("bg-primary/50", names), "--color-primary")
  assert.equal(tokenFromClass("dark:text-primary", names), "--color-primary")
  assert.equal(tokenFromClass("rounded-md", names), "--radius-md")
  assert.equal(tokenFromClass("font-sans", names), "--font-sans")
  assert.equal(
    tokenFromClass("animate-accordion-down", names),
    "--animate-accordion-down"
  )
  assert.equal(tokenFromClass("ease-campus-snap", names), "--ease-campus-snap")
})

void test("a class that names nothing in the stylesheet resolves to null", () => {
  const names = new Set(["--color-primary"])
  // `text-sm` and `font-medium` look like colours and families, and are neither.
  assert.equal(tokenFromClass("text-sm", names), null)
  assert.equal(tokenFromClass("font-medium", names), null)
  assert.equal(tokenFromClass("shadow-sm", names), null)
  assert.equal(tokenFromClass("border", names), null)
})
