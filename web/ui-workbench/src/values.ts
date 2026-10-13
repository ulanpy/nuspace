/**
 * Reading and writing a CSS value. Everything here is a pure function over a
 * string, so the token sheet can offer a slider for a radius, a unit toggle for a
 * duration and a notation toggle for a colour without the logic living inside a
 * component. `values.test.ts` covers it; nothing here touches the DOM.
 */

export type Notation = "hsl" | "rgb" | "hex"

/**
 * Split on a separator, but only at the top level: a space inside
 * `hsl(214 80.7% 98.4%)` and a comma inside `cubic-bezier(0.16, 1, 0.3, 1)` are
 * part of the value. Quoted strings are opaque too, which is what keeps a font
 * family with a space in it in one piece.
 */
function splitTopLevel(value: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (quote) {
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === "(") depth += 1
    else if (char === ")") depth -= 1
    else if (depth === 0 && char === separator) {
      parts.push(value.slice(start, index).trim())
      start = index + 1
    }
  }

  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

/**
 * A font stack is a comma list and an animation shorthand is a space list, so
 * try both and keep whichever actually breaks the value up. One part means there
 * is nothing to divide.
 */
export function splitParts(value: string): {
  parts: string[]
  separator: string
} {
  for (const [separator, joined] of [
    [",", ", "],
    [" ", " "],
  ]) {
    const parts = splitTopLevel(value, separator)
    if (parts.length > 1) return { parts, separator: joined }
  }

  return { parts: [value], separator: " " }
}

/**
 * A list of parts back into one value. A row the user has just added is empty and
 * has nothing to contribute yet, so it is dropped here rather than written as a
 * dangling separator. `PartField` holds its own list, so the row is still there
 * to be typed into.
 */
export const joinParts = (parts: string[], separator: string) =>
  parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator)

/* ------------------------------------------------------------------- colour */

export function detectNotation(value: string): Notation | null {
  const trimmed = value.trim()
  if (trimmed.startsWith("#")) return "hex"
  if (/^rgba?\(/i.test(trimmed)) return "rgb"
  if (/^hsla?\(/i.test(trimmed)) return "hsl"
  return null
}

const triplet = (hex: string) =>
  [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16))

/**
 * A number as a person would write it. Every number the workbench puts into a
 * value goes through here, because the arithmetic that produced it is exact to
 * fifteen places and the stylesheet is read by people: `24.581497797356803` is a
 * number nobody chose.
 */
export const round = (n: number, places = 1) => {
  const scale = 10 ** places
  return Math.round(n * scale) / scale
}

export const hexToRgb = (hex: string) => `rgb(${triplet(hex).join(" ")})`

export function hexToHsl(hex: string) {
  const [r, g, b] = triplet(hex).map((part) => part / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const light = (max + min) / 2

  const hue =
    delta === 0
      ? 0
      : max === r
        ? 60 * (((g - b) / delta) % 6)
        : max === g
          ? 60 * ((b - r) / delta + 2)
          : 60 * ((r - g) / delta + 4)

  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1))

  return `hsl(${round((hue + 360) % 360)} ${round(sat * 100)}% ${round(light * 100)}%)`
}

/**
 * Write a value in a chosen notation. A value that is already in it is returned
 * untouched, and so is one with no hex to convert from: an alias, or a colour
 * with alpha, both of which a picker would otherwise quietly rewrite.
 */
export function convert(value: string, to: Notation, hex: string | null) {
  const from = detectNotation(value)
  if (from === to || from === null || !hex) return value
  return to === "hex" ? hex : to === "rgb" ? hexToRgb(hex) : hexToHsl(hex)
}

/** Relative luminance, 0 to 1. Decides whether a label on a swatch is legible. */
export function luminance(hex: string) {
  const [r, g, b] = triplet(hex).map((part) => {
    const channel = part / 255
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/* ------------------------------------------------------------------ measures */

export type Radius =
  | { kind: "len"; n: number; unit: string }
  | { kind: "mult"; n: number; base: string }
  | null

/**
 * A radius a slider can drive, which means an absolute length or a multiplier of
 * another token. A percentage is a radius too, but it has no length to slide
 * through, so it is left to the text editor rather than given a misleading scale.
 */
export function radiusOf(value: string): Radius {
  const calc = /^calc\(\s*var\((--[\w-]+)\)\s*\*\s*([\d.]+)\s*\)$/.exec(
    value.trim()
  )
  if (calc) return { kind: "mult", n: Number(calc[2]), base: calc[1] }

  const len = /^(-?[\d.]+)(rem|px|em)$/.exec(value.trim())
  if (len) return { kind: "len", n: Number(len[1]), unit: len[2] }

  return null
}

/** The text a radius parses back out of, so a slider writes the same shape. */
export function radiusText(radius: NonNullable<Radius>) {
  return radius.kind === "len"
    ? `${round(radius.n, 2)}${radius.unit}`
    : `calc(var(${radius.base}) * ${round(radius.n, 2)})`
}

export type Duration = { n: number; unit: "ms" | "s"; ms: number }

const UNIT = /^([\d.]+)(ms|s)$/

export function durationOf(value: string): Duration | null {
  const match = UNIT.exec(value.trim())
  if (!match) return null
  const ms = match[2] === "s"
  return {
    n: Number(match[1]),
    unit: ms ? "s" : "ms",
    ms: Number(match[1]) * (ms ? 1000 : 1),
  }
}

/**
 * Rewrite a duration in another unit. Whole milliseconds stay whole, so
 * switching to seconds and back gives the number you started with rather than
 * 179.9999.
 */
export function formatDuration(n: number, from: "ms" | "s", to: "ms" | "s") {
  const ms = from === "ms" ? n : n * 1000
  if (to === "ms") return `${Math.round(ms)}ms`
  return `${Number((Math.round(ms) / 1000).toFixed(3))}s`
}

/* -------------------------------------------------------------------- easing */

/** `cubic-bezier(0.16, 1, 0.3, 1)` as a name and four numbers, so each is editable. */
export function cubicBezierOf(value: string) {
  const match =
    /^([a-z-]+)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/.exec(
      value.trim()
    )
  if (!match) return null
  return { name: match[1], args: match.slice(2).map(Number) }
}

export const formatFunction = (name: string, args: readonly number[]) =>
  `${name}(${args.join(", ")})`

/**
 * The timing functions a stylesheet may name instead of spelling out a curve,
 * with the curve each one stands for. These are the values the CSS timing
 * functions are defined as, so editing a keyword's numbers and writing it back as
 * `cubic-bezier(...)` describes the same motion.
 */
export const EASINGS: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
}

/** What the dropdown offers, keywords first and the spelled-out curve last. */
export const EASING_NAMES = [...Object.keys(EASINGS), "cubic-bezier"]

/**
 * A timing function as a name and four numbers, whichever way the file writes
 * it. Without the keyword case, a token holding `ease-out` has nothing to edit
 * and no way to become a curve of its own.
 */
export function easingOf(value: string) {
  const spelled = cubicBezierOf(value)
  if (spelled) return spelled

  const name = value.trim()
  const args = EASINGS[name]
  return args ? { name, args } : null
}

/** A chosen timing function written out: a keyword, or the curve with its name. */
export const formatEasing = (name: string, args: readonly number[]) =>
  name in EASINGS ? name : formatFunction(name, args)

/**
 * What a new token of a type starts with. A token is added to be edited, so its
 * first value has to be one the editor for that type can drive: a colour the
 * picker can read, a radius with a length, a duration with a unit.
 */
const DEFAULTS: Record<string, string> = {
  color: "hsl(217 68% 42%)",
  radius: "0.5rem",
  spacing: "0.5rem",
  typography: '"Inter", sans-serif',
  motion: "180ms",
  shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  other: "0",
}

/**
 * What each part of a composite value is called. The parts of an animation
 * shorthand and of a shadow have names of their own, and `part 2` says nothing
 * about which quarter of the motion or the shadow a row is.
 */
const NAMED_PARTS: Record<string, string[]> = {
  motion: ["name", "duration", "easing"],
  shadow: ["x", "y", "blur", "spread", "colour"],
}

/** The label for one row of a composite value, by what the value is. */
export function partLabel(type: string, index: number) {
  if (type === "typography")
    return index === 0 ? "family" : `family ${index + 1}`

  const parts = NAMED_PARTS[type]
  if (parts && index < parts.length) return parts[index]

  return index === 0 ? "part" : `part ${index + 1}`
}

export const defaultFor = (category: string) =>
  DEFAULTS[category] ?? DEFAULTS.other

/**
 * The shapes a motion value can be written in: a named curve, the curve spelled
 * out, and a duration in either unit. One field takes all of them, so this is the
 * dropdown, and what picking one writes.
 */
export const MOTION_OPTIONS = [...EASING_NAMES, "ms", "s"]

/**
 * Which shape the value is already written as, which is what the dropdown should
 * be showing. A shape is asked about by what the value is, not by what it says:
 * `220ms` is a millisecond duration whether or not `180ms` is the one the list
 * would write.
 */
export function motionOption(value: string) {
  const trimmed = value.trim()
  if (EASINGS[trimmed]) return trimmed

  const duration = durationOf(trimmed)
  if (duration) return duration.unit

  return cubicBezierOf(trimmed) ? "cubic-bezier" : ""
}

/**
 * The value a shape is written as. A duration keeps its own length and changes
 * unit, since `0.22s` and `220ms` are the same duration and the author chose the
 * first one. A curve keeps its numbers when it already has them. The two cases
 * that cannot keep anything, a duration written as a curve and a curve written as
 * a duration, start from the motion default and the ease-out curve respectively.
 */
export function motionText(option: string, from?: string) {
  if (option === "ms" || option === "s") {
    const duration = durationOf(from ?? "") ?? durationOf(DEFAULTS.motion)
    return duration
      ? formatDuration(duration.n, duration.unit, option)
      : DEFAULTS.motion
  }
  if (option === "cubic-bezier")
    return formatEasing(
      "cubic-bezier",
      easingOf(from ?? "")?.args ?? EASINGS["ease-out"]
    )

  return formatEasing(option, EASINGS[option] ?? EASINGS["ease-out"])
}

/* ------------------------------------------------------------------- classes */

const CLASS_PREFIX =
  /^(?:[a-z-]+:)*(bg|text|border|ring|outline|fill|stroke|shadow|rounded|font|animate|ease)-(.+)$/

/**
 * `bg-primary/50` is `--color-primary` and `rounded-lg` is `--radius-lg`. Only a
 * name the stylesheet declares is returned, which is what keeps `text-sm` and
 * `font-medium` out of the answer.
 */
export function tokenFromClass(word: string, names: ReadonlySet<string>) {
  const match = CLASS_PREFIX.exec(word)
  if (!match) return null

  const namespace =
    match[1] === "rounded"
      ? "radius"
      : match[1] === "font"
        ? "font"
        : match[1] === "animate"
          ? "animate"
          : match[1] === "ease"
            ? "ease"
            : match[1] === "shadow"
              ? "shadow"
              : "color"

  const name = `--${namespace}-${match[2].replace(/\/[\d.]+$/, "")}`
  return names.has(name) ? name : null
}
