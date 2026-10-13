/**
 * The token sheet, in two places.
 *
 * `TokenSheet` is the tokens page: every declaration on one page, with the
 * editor for the selected token and the file's own text docked in a panel at the
 * bottom. `UsedByRail` is the right-hand panel on a component or page: the tokens
 * that component's whole import tree touches, with the same editor, so a value
 * can be changed while the component is on screen.
 *
 * Reading and writing a value lives in `values.ts`, and the walk that finds what a
 * component uses lives in `usage.ts`. Both are covered by their own tests.
 */
import {
  Fragment,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import {
  ChevronDown,
  PanelBottomClose,
  PanelBottomOpen,
  Play,
  Plus,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Slider } from "@/components/ui/slider"

import workbench from "../ui-workbench.config"

import {
  buildSections,
  categoryLabel,
  categoryOf,
  chain,
  DARK_BLOCK,
  isAlias,
  keyOf,
  patchPlan,
  readersOf,
  resolveToken,
  TYPES,
  withRelated,
} from "./tokens"
import type { Section, Token } from "./tokens"
import { usedTokens } from "./usage"
import {
  convert,
  defaultFor,
  detectNotation,
  durationOf,
  easingOf,
  joinParts,
  luminance,
  motionOption,
  motionText,
  partLabel,
  MOTION_OPTIONS,
  radiusOf,
  radiusText,
  splitParts,
  type Notation,
} from "./values"

/** `--primary` reads as `primary`. The dashes are syntax, not part of the name. */
const bare = (name: string) => name.replace(/^--/, "")

/** Re-render when the root's theme class changes. Nothing else reports it, since
 * the toggle below writes the class rather than any state. */
function useRootClass() {
  return useSyncExternalStore(
    (onChange) => {
      const observer = new MutationObserver(onChange)
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      })
      return () => observer.disconnect()
    },
    () => document.documentElement.className
  )
}

/** Whether the preview is in the dark theme. */
export function useIsDark() {
  return useRootClass().split(/\s+/).includes(workbench.darkClass)
}

/** The block a reference follows when its own block does not declare the name. */
export function useActiveBlock() {
  return useIsDark() ? DARK_BLOCK : undefined
}

/**
 * The download: the one text, and how many edits it is. The header counts the
 * same number, so the button and the file it writes cannot disagree.
 */
export function downloadPlan(
  source: string,
  tokens: Token[],
  sheet: SheetState
) {
  return patchPlan(source, tokens, sheet.valueOf)
}

/* ------------------------------------------------------------------ sources */

/**
 * Every file as text, so what a component uses is a walk rather than a guess.
 * The keys are the paths the glob produced, which are relative to this folder,
 * and `@/` means the app's `src` in that same namespace.
 */
const SOURCES: Record<string, string> = {
  ...import.meta.glob("../../src/**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../{components,pages}/*.wb.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  // Fixtures hold markup too. They are walked, never listed.
  ...import.meta.glob("../{components,pages}/*.wb.demo.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
}

/**
 * Where `@/` points, as a glob path from this folder. `ui-workbench.config.ts`
 * already answers that, in a form relative to the app root, which is two levels
 * up from here.
 */
const ALIAS_BASE = `../../${Object.values(workbench.alias)[0]}`

/* ------------------------------------------------------------------ sections */

/* --------------------------------------------------------------- colour help */

const hexCache = new Map<string, string | null>()

/** Let the browser do it, so the answer matches what is painted. */
function toHex(value: string): string | null {
  if (hexCache.has(value)) return hexCache.get(value) ?? null

  const probe = document.createElement("span")
  probe.style.color = value
  document.body.append(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()

  const match = /^rgba?\((\d+), (\d+), (\d+)(?:,\s*([\d.]+))?\)/.exec(rgb)
  // A colour with alpha has no single hex, and the picker would drop the alpha.
  const hex =
    !match || (match[4] !== undefined && Number(match[4]) < 1)
      ? null
      : `#${match
          .slice(1, 4)
          .map((part) => Number(part).toString(16).padStart(2, "0"))
          .join("")}`

  hexCache.set(value, hex)
  return hex
}

/**
 * A label on a swatch has to be readable on whatever it sits on. The declared
 * foreground partner is the right answer when there is one, and a black or white
 * chosen by luminance is the fallback, because a label that vanishes is worse
 * than one that is not quite the design system's choice of black.
 */
function labelColour(value: string, partner: string | null) {
  if (partner) return `var(${partner})`
  const hex = toHex(value)
  return hex && luminance(hex) > 0.4 ? "#000" : "#fff"
}

/* ------------------------------------------------------------------ controls */

/**
 * What a token is, on offer as the types a value could be edited as. Picking one
 * retypes the token and its value follows.
 *
 * Outlined and with a chevron, because this is the only control in the row that
 * opens something: as bare text it read as another label on the token.
 */
function TypeMenu({
  label,
  onPick,
}: {
  label: string
  onPick: (category: string) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="xs"
            variant="outline"
            className="font-normal text-muted-foreground"
          />
        }
      >
        {label}
        <ChevronDown aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {TYPES.map((option) => (
          <DropdownMenuItem key={option.id} onClick={() => onPick(option.id)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Notations({
  notation,
  onChange,
  className = "",
}: {
  notation: Notation
  onChange: (notation: Notation) => void
  className?: string
}) {
  return (
    <NativeSelect
      size="sm"
      aria-label="Colour notation"
      value={notation}
      onChange={(event) => {
        const next = event.target.value
        onChange(next === "rgb" ? "rgb" : next === "hex" ? "hex" : "hsl")
      }}
      className={`shrink-0 ${className}`}
    >
      <NativeSelectOption value="hsl">hsl</NativeSelectOption>
      <NativeSelectOption value="rgb">rgb</NativeSelectOption>
      <NativeSelectOption value="hex">hex</NativeSelectOption>
    </NativeSelect>
  )
}

function ColorField({
  token,
  value,
  notation,
  onNotation,
  onChange,
}: {
  token: Token
  value: string
  notation: Notation
  onNotation: (notation: Notation) => void
  onChange: (value: string) => void
}) {
  const hex = toHex(value)

  return (
    // `flex-wrap` with the notation on its own line below `sm`: on a phone the
    // value is what is being read, and a 96px dropdown beside it takes a third of
    // the line to name the notation the value already uses.
    <div className="flex w-full flex-wrap items-center gap-2">
      {hex ? (
        <input
          type="color"
          aria-label={`${bare(token.name)} colour`}
          title={bare(token.name)}
          value={hex}
          // The picker speaks hex, so every write goes out in the notation the
          // field is set to rather than whatever the picker felt like.
          onChange={(event) =>
            onChange(convert(event.target.value, notation, event.target.value))
          }
          className="size-7 shrink-0 cursor-pointer rounded-md border bg-transparent p-0"
        />
      ) : (
        <span
          aria-hidden
          className="block size-7 shrink-0 rounded-md border"
          style={{ background: value }}
        />
      )}

      <Input
        value={value}
        aria-label={bare(token.name)}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 min-w-0 flex-1 font-mono text-xs"
      />

      {/* Nothing to offer when the value has no hex to convert through: an
          alpha colour, or a notation this does not read. A dropdown that moves
          the field does not is worse than none. */}
      {hex && (
        <Notations
          notation={notation}
          onChange={(next) => {
            onNotation(next)
            onChange(convert(value, next, hex))
          }}
          className="order-last w-full sm:order-none sm:w-24"
        />
      )}
    </div>
  )
}

/**
 * One input per part of a composite value: a family in a font stack, the name,
 * duration and easing of an animation shorthand, the x, y, blur, spread and colour
 * of a shadow. Editing one rewrites the whole value, so the file keeps a single
 * declaration. What each row is called comes from `values.ts`.
 *
 * The list is state, not derived from the value, because a row the user has just
 * added is empty and `splitParts` would drop it on the next render.
 */
function PartField({
  type,
  value,
  onChange,
}: {
  type: string
  value: string
  onChange: (value: string) => void
}) {
  const [parts, setParts] = useState(() => splitParts(value).parts)
  const separator = splitParts(value).separator

  const write = (next: string[]) => {
    setParts(next)
    onChange(joinParts(next, separator))
  }

  return (
    <div className="w-full space-y-1.5">
      {parts.map((part, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-16 shrink-0 truncate text-xs text-muted-foreground">
            {partLabel(type, index)}
          </span>
          <Input
            value={part}
            aria-label={partLabel(type, index)}
            onChange={(event) =>
              write(parts.map((p, i) => (i === index ? event.target.value : p)))
            }
            className="h-7 min-w-0 flex-1 font-mono text-xs"
          />
          {parts.length > 1 && (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Remove ${partLabel(type, index)}`}
              className="text-muted-foreground/60 hover:text-destructive"
              onClick={() => write(parts.filter((_, i) => i !== index))}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
      ))}
      <Button
        variant="ghost"
        size="xs"
        className="text-muted-foreground"
        onClick={() => write([...parts, ""])}
      >
        <Plus aria-hidden />
        Add {type === "typography" ? "family" : "part"}
      </Button>
    </div>
  )
}

/**
 * A length as a slider, with the unit it is written in left alone. A radius and a
 * space are the same shape of value, so they get the same control; a radius
 * written as a multiplier of another token is driven the same way.
 *
 * The range is the value's, not one range for everything. A radius tops out around
 * two rem and a spacing scale runs to four and beyond, and a scale of eight rem
 * against a value written in pixels pins the thumb at its end and rewrites the
 * first thing it is dragged to.
 */
const LENGTH_RANGE = {
  radius: { max: 2, step: 0.02 },
  spacing: { max: 8, step: 0.25 },
} as const

/** A value written as a multiple of another token, which is its own scale. */
const MULTIPLIER = { max: 4, step: 0.05 }

/** In pixels the numbers are three orders larger, so the range is too. */
const PIXEL_RANGE = { max: 64, step: 1 }

function RadiusField({
  token,
  type,
  value,
  onChange,
}: {
  token: Token
  type: string
  value: string
  onChange: (value: string) => void
}) {
  const radius = radiusOf(value)
  if (!radius) return null

  // The slider drives the number, so the readout is that number and what it is a
  // multiple of. The whole `calc(var(--radius) * 0.8)` is twice the width of the
  // box it has, and truncated it says nothing.
  const readout =
    radius.kind === "mult" ? `${radius.n} × ${bare(radius.base)}` : value
  const scale =
    radius.kind === "mult"
      ? MULTIPLIER
      : radius.unit === "px"
        ? PIXEL_RANGE
        : LENGTH_RANGE[type === "spacing" ? "spacing" : "radius"]

  return (
    // The slider is wrapped rather than sized, because the component is `w-full`
    // by default and a width class on it loses to that. It is given the width it
    // can use rather than one it hopes for: a fixed 16rem inside a column narrower
    // than that is what put a scrollbar under the track.
    <div className="flex w-full flex-col items-end gap-1 lg:flex-row lg:items-center lg:gap-3">
      <div className="w-full min-w-0 lg:w-64">
        <Slider
          aria-label={bare(token.name)}
          title={value}
          value={radius.n}
          min={0}
          max={scale.max}
          step={scale.step}
          onValueChange={(n) =>
            onChange(radiusText({ ...radius, n: Number(n) }))
          }
        />
      </div>
      <code
        title={value}
        className="w-full shrink-0 truncate text-right font-mono text-xs text-muted-foreground lg:w-40"
      >
        {readout}
      </code>
    </div>
  )
}

/**
 * A duration or a timing function, in one field. Both are one short piece of text
 * and a stylesheet may write either, so the input takes whatever is written and
 * the dropdown offers the shapes it can be written in: a named curve, the curve
 * spelled out, or a duration in either unit. Picking one writes that shape with a
 * value of its own, so nothing has to be parsed back on the way out.
 *
 * Four inputs for the four numbers of a curve was the alternative, and a curve is
 * rare enough in a stylesheet that the room was worth more spent on the value.
 * The specimen still draws the curve and prints the numbers beside it.
 */
function MotionField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    // The shape dropdown drops under the value below `sm`, for the same reason
    // the notation does: on a phone the value is the line and the dropdown is the
    // part of it that is already written.
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        value={value}
        aria-label="Duration or easing"
        onChange={(event) => onChange(event.target.value)}
        className="h-7 min-w-0 flex-1 font-mono text-xs"
      />
      {/* A value that is none of the offered shapes leaves this empty, which says
          the text is in charge of it. */}
      <NativeSelect
        size="sm"
        aria-label="Written as"
        value={motionOption(value)}
        onChange={(event) => onChange(motionText(event.target.value))}
        className="order-last w-full shrink-0 sm:order-none sm:w-28"
      >
        {MOTION_OPTIONS.map((option) => (
          <NativeSelectOption key={option} value={option}>
            {option}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}

/** The field for a value, decided by what the token is rather than by its name. */
function ValueField({
  token,
  type,
  value,
  notation,
  onNotation,
  onChange,
}: {
  token: Token
  type: string
  value: string
  notation: Notation
  onNotation: (notation: Notation) => void
  onChange: (value: string) => void
}) {
  // An alias paints whatever it points at, so a picker on it would write a hex
  // over the reference and quietly break the link.
  if (isAlias(value))
    return (
      <code className="block truncate font-mono text-xs text-muted-foreground">
        {value}
      </code>
    )

  if (type === "color")
    return (
      <ColorField
        token={token}
        value={value}
        notation={notation}
        onNotation={onNotation}
        onChange={onChange}
      />
    )

  if (type === "radius" || type === "spacing")
    return (
      <RadiusField
        token={token}
        type={type}
        value={value}
        onChange={onChange}
      />
    )

  // A duration and a curve are the same kind of token, one short piece of text,
  // and a shorthand like `accordion-down 0.2s ease-out` is a list of parts rather
  // than either.
  if (easingOf(value) || durationOf(value))
    return <MotionField value={value} onChange={onChange} />

  if (splitParts(value).parts.length > 1)
    return (
      <PartField
        key={keyOf(token)}
        type={type}
        value={value}
        onChange={onChange}
      />
    )

  return (
    <Input
      value={value}
      aria-label={bare(token.name)}
      onChange={(event) => onChange(event.target.value)}
      className="h-7 min-w-0 flex-1 font-mono text-xs"
    />
  )
}

/** Tokens whose job is a line rather than a fill. A big block of `--border` lies. */
const LINE_TOKENS = new Set([
  "border",
  "input",
  "ring",
  "disabled",
  "muted",
  "accent",
  "secondary",
  "card",
  "popover",
  "sidebar",
  "sidebar-border",
  "sidebar-ring",
])

/** A paragraph, because one word in a family proves nothing about a family. */
const SPECIMEN_TEXT =
  "The registrar opens on Monday at nine, and the queue is already long by the time the light comes up over the courtyard."

/**
 * What the value looks like, in a box that says it is a rendering rather than
 * another field.
 *
 * The box is here rather than at the call site because the box is only worth
 * drawing around something: a value with no rendering of its own, such as an
 * arbitrary number, would otherwise leave a dashed rectangle of empty air beside
 * its own control.
 */
function Specimen({
  token,
  type,
  value,
  names,
  boxClass,
}: {
  token: Token
  type: string
  value: string
  names: ReadonlySet<string>
  boxClass: string
}) {
  const rendered = SpecimenBody({ token, type, value, names })
  if (!rendered) return null

  return (
    <div
      className={`flex items-center justify-center rounded-md border border-dashed p-2 ${boxClass}`}
    >
      {rendered}
    </div>
  )
}

function SpecimenBody({
  token,
  type,
  value,
  names,
}: {
  token: Token
  type: string
  value: string
  names: ReadonlySet<string>
}) {
  const name = bare(token.name)
  const className = "h-full w-full"

  if (type === "color") {
    const partner = `--${name}-foreground`

    // A flat block tells you the hue and nothing else. Where the file declares a
    // foreground to go with it, show the pair doing the job it exists for. The
    // sample is two letters rather than the name, which the row already says.
    if (names.has(partner))
      return (
        <span
          className={`flex items-center justify-center overflow-hidden rounded-md font-medium whitespace-nowrap ${className}`}
          style={{ background: value, color: labelColour(value, partner) }}
        >
          <span className="text-[10px]">Aa</span>
        </span>
      )

    if (LINE_TOKENS.has(name))
      return (
        <span
          className={`block rounded-sm border-2 ${className}`}
          style={{ borderColor: value }}
        />
      )

    return (
      <span
        // The hairline is what makes a near-white fill visible on a near-white
        // page, which is most of this palette.
        className={`block rounded-md border ${className}`}
        style={{ background: value }}
      />
    )
  }

  if (type === "radius")
    return (
      <span
        aria-hidden
        className={`block shrink-0 border-2 border-foreground/25 bg-muted ${className}`}
        style={{ borderRadius: value }}
      />
    )

  // A space is a length, so it is shown as one: a track of a fixed width with the
  // token's own length filled in it. Every spacing specimen is the same track, so
  // two of them can be compared by looking, which is the whole question a spacing
  // scale is answered with.
  if (type === "spacing")
    return (
      <span
        aria-hidden
        className={`flex items-center rounded bg-muted px-1 ${className}`}
      >
        <span
          className="block h-2.5 rounded-sm bg-foreground/70"
          style={{ width: value, minWidth: "2px" }}
        />
      </span>
    )

  // A shadow is only a shadow on something. A card casting one is the whole of
  // what a shadow token is for.
  if (type === "shadow")
    return (
      <span
        aria-hidden
        className={`flex items-center justify-center bg-background ${className}`}
      >
        <span
          className="block size-10 rounded-md border bg-card"
          style={{ boxShadow: value }}
        />
      </span>
    )

  if (type === "typography")
    return (
      <span
        className={`flex flex-col overflow-hidden ${className}`}
        style={{ fontFamily: value }}
      >
        <span className="text-xl leading-tight">{name}</span>
        <span className="mt-1 line-clamp-3 text-[11px] leading-snug text-balance">
          {SPECIMEN_TEXT}
        </span>
      </span>
    )

  if (type === "motion" || /^animate/.test(token.name))
    return <MotionSpecimen value={value} />

  if (easingOf(value)) return <BezierSpecimen value={value} />

  const duration = durationOf(value)
  if (duration)
    return (
      <span aria-hidden className={`flex items-center ${className}`}>
        <span
          className="block h-1.5 rounded-full bg-primary"
          style={{ width: `${Math.min(100, duration.ms / 12)}%` }}
        />
      </span>
    )

  return null
}

/** A transition that runs at the token's own duration and easing. */
function MotionSpecimen({ value }: { value: string }) {
  const [run, setRun] = useState(0)
  const { parts } = splitParts(value)

  return (
    <button
      type="button"
      aria-label="Play the transition"
      onClick={() => setRun((n) => n + 1)}
      className="flex items-center gap-2"
    >
      <span className="relative block h-1.5 w-28 overflow-hidden rounded-full bg-muted">
        <span
          key={run}
          className="absolute inset-y-0 left-0 block w-4 rounded-full bg-primary"
          style={{
            animation: `wb-specimen-slide ${parts[1] ?? "0.2s"} ${parts[2] ?? "ease-out"} both`,
          }}
        />
      </span>
      <Play aria-hidden className="size-3 shrink-0 text-muted-foreground" />
    </button>
  )
}

/** A dot travelling the curve, so the shape of the easing is visible. */
function BezierSpecimen({ value }: { value: string }) {
  const easing = easingOf(value)
  const points = useMemo(() => {
    if (!easing) return []
    const [, x1, y1, x2, y2] = easing.args
    return Array.from({ length: 24 }, (_, step) => {
      const t = step / 23
      // The CSS timing-function definition, inverted: t is the fraction of the
      // duration and the curve gives where along it we are.
      const mt = 1 - t
      return {
        x: 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t,
        y: 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t,
      }
    })
  }, [easing])

  if (!easing) return null

  return (
    <span className="flex items-center gap-2">
      <svg
        aria-hidden
        viewBox="-0.1 -0.1 1.2 1.2"
        className="size-8 shrink-0 overflow-visible"
      >
        <path
          d="M0,1 L1,0"
          stroke="currentColor"
          strokeOpacity="0.2"
          fill="none"
        />
        <polyline
          points={points.map((p) => `${p.x},${1 - p.y}`).join(" ")}
          className="stroke-primary"
          strokeWidth="0.06"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="1" cy="0" r="0.07" className="fill-primary" />
      </svg>
      {/* The four numbers, whether the file names the function or spells it out. */}
      <code className="font-mono text-[10px] text-muted-foreground">
        {easing.args.join(", ")}
      </code>
    </span>
  )
}

/* ------------------------------------------------------------------- the row */

type Row = {
  token: Token
  type: string
  value: string
}

type EditorProps = {
  tokens: Token[]
  row: Row
  onEdit: (token: Token, value: string) => void
  /** What the token is, which is what decides the control below. */
  typeOf: (token: Token) => string
  onType: (token: Token, category: string) => void
  active: string | undefined
  notationOf: (token: Token, value: string) => Notation
  onNotation: (token: Token, notation: Notation) => void
  onSelect: (key: string) => void
}

function LedgerRow({
  row,
  active,
  onSelect,
}: {
  row: Row
  active: boolean
  onSelect: () => void
}) {
  const { token, value } = row

  return (
    <div
      className={`group flex items-center border-l-2 transition-colors ${
        active
          ? "border-ring bg-muted/60"
          : "border-transparent hover:bg-muted/40"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active}
        className="flex min-w-0 flex-1 items-center gap-3 py-1 pr-2 pl-3 text-left"
      >
        <span className="w-4 shrink-0">
          {row.type === "color" && (
            <span
              aria-hidden
              className="block size-3.5 rounded-sm border"
              style={{ background: value }}
            />
          )}
        </span>
        <code className="w-32 shrink-0 truncate font-mono text-xs sm:w-44">
          {bare(token.name)}
        </code>
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
          {value}
        </code>
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- the editor */

/** What an editor needs, spelled once for both surfaces that show one. */
const editorProps = (
  tokens: Token[],
  sheet: SheetState,
  onEdit: (token: Token, value: string) => void,
  row: Row
): EditorProps => ({
  tokens,
  row,
  onEdit,
  typeOf: sheet.typeOf,
  onType: sheet.onType,
  active: sheet.active,
  notationOf: sheet.notationOf,
  onNotation: sheet.onNotation,
  onSelect: sheet.onSelect,
})

function Editor({
  tokens,
  row,
  onEdit,
  typeOf,
  onType,
  active,
  notationOf,
  onNotation,
  onSelect,
}: EditorProps) {
  const { token, value } = row
  const type = typeOf(token)
  const names = useMemo(
    () => new Set(tokens.map((candidate) => candidate.name)),
    [tokens]
  )

  // `calc(var(--radius) * 0.6)` depends on `--radius` just as much as an alias
  // does, so the chain is walked rather than only the first reference.
  const depends = useMemo(
    () => chain(token, tokens, active),
    [token, tokens, active]
  )
  const readBy = readersOf(token.name, tokens)

  const jump = (target: Token) => () => onSelect(keyOf(target))

  const relation = (label: string, list: Token[]) => (
    <RelationLinks label={label} tokens={list} onJump={jump} />
  )

  // Three lines of a stated height, so the frame is the same for every token and
  // the list underneath does not jump as the selection moves. What does not fit,
  // such as a five-family stack, scrolls in the value column rather than making
  // the editor taller.
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-7 shrink-0 items-center overflow-hidden">
        <code className="truncate font-mono text-lg font-medium">
          {bare(token.name)}
        </code>
      </div>

      <div className="flex h-6 shrink-0 items-center gap-2 overflow-hidden">
        <TypeMenu
          label={categoryLabel(type)}
          onPick={(category) => {
            onType(token, category)
            // A value of the old shape has nothing for the new control to drive,
            // so the token starts on the default for its type. An alias is left
            // alone: it mirrors whatever it points at, and takes that type.
            if (!isAlias(value)) onEdit(token, defaultFor(category))
          }}
        />
        <span className="truncate font-mono text-xs text-muted-foreground">
          in {token.block}
        </span>
        {/* The connections share this line, so they are the ones that give way:
            below `lg` each is a count, which is a click from every name. */}
        <div className="ml-auto flex min-w-0 shrink items-center gap-x-4 overflow-hidden pl-4 text-xs text-muted-foreground">
          {relation("depends on", depends)}
          {relation("read by", readBy)}
        </div>
      </div>

      {/* Stacked below `lg`, where a preview and a control side by side leave
          neither enough width: a paragraph of a font family in 150px is a line of
          grey, and a family input in 150px is a scrollbar. No `items-center`,
          because that lets the control take its content's height and spill out of
          the row it is supposed to be inside. */}
      <div className="flex h-48 shrink-0 flex-col gap-3 lg:h-28 lg:flex-row lg:gap-4">
        <Specimen
          token={token}
          type={type}
          value={value}
          names={names}
          boxClass={specimenBox(type)}
        />
        <ValueColumn>
          <ValueField
            token={token}
            type={type}
            value={value}
            notation={notationOf(token, value)}
            onNotation={(notation) => onNotation(token, notation)}
            onChange={(next) => onEdit(token, next)}
          />
        </ValueColumn>
      </div>
    </div>
  )
}

/**
 * How much room a specimen needs, which is what the value is.
 *
 * Stated rather than shared out, so the specimen is never the thing that gives way
 * when the window narrows: a preview beside a control that grows to fill the row
 * is a paragraph of a font family squeezed down to nothing.
 */
const specimenBox = (type: string) => {
  if (type === "typography") return "h-20 w-full lg:h-28 lg:w-96"
  if (type === "radius" || type === "spacing") return "size-20"
  if (type === "motion") return "h-20 w-full lg:h-28 lg:w-44"
  return "h-20 w-full lg:h-28 lg:w-36"
}

/**
 * The value control in a box that scrolls instead of growing: the frame is stated,
 * so a five-family stack is clipped and scrolled rather than taller, and one short
 * control sits in the middle of the box it has.
 *
 * `overflow-x-hidden` because nothing in here should ever be the reason the page
 * scrolls sideways, and a control wider than its column is a bug to look at, not
 * something to scroll.
 */
function ValueColumn({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
      <div className="flex min-h-full items-center">{children}</div>
    </div>
  )
}

/**
 * The tokens on the other end of a reference, as links.
 *
 * `--radius` is read by seven tokens, so the list is capped and the rest sit
 * behind a count. A line that grows until it runs off the edge of the window is
 * the thing this replaces: the count is bounded, every link is one click away
 * either way, and the editor keeps its height.
 *
 * Below `lg` the count carries all of them, because the line that holds them is
 * the same line as the type and the block, and three links there is a line wider
 * than the window.
 */
const RELATION_LINKS = 3

function RelationLinks({
  label,
  tokens,
  onJump,
}: {
  label: string
  tokens: Token[]
  onJump: (token: Token) => () => void
}) {
  if (tokens.length === 0) return false
  const shown = tokens.slice(0, RELATION_LINKS)
  const rest = tokens.slice(RELATION_LINKS)

  return (
    <span className="flex shrink-0 items-baseline gap-1.5">
      <span className="shrink-0">{label}</span>
      {/* `contents` so the links are laid out by the line around them. */}
      <span className="hidden lg:contents">
        {shown.map((token, index) => (
          <Fragment key={keyOf(token)}>
            {index > 0 && ", "}
            <button
              type="button"
              onClick={onJump(token)}
              className="font-mono underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              {bare(token.name)}
            </button>
          </Fragment>
        ))}
      </span>
      {rest.length > 0 && (
        <MoreLinks
          tokens={rest}
          onJump={onJump}
          aria={`${label}, ${rest.length} more`}
          className="hidden lg:inline-flex"
        />
      )}
      <MoreLinks
        tokens={tokens}
        onJump={onJump}
        aria={`${label}, all ${tokens.length}`}
        className="lg:hidden"
      >
        {tokens.length}
      </MoreLinks>
    </span>
  )
}

/** The rest of a list, or all of it on a narrow window. One menu either way. */
function MoreLinks({
  tokens,
  onJump,
  aria,
  className = "",
  children,
}: {
  tokens: Token[]
  onJump: (token: Token) => () => void
  aria: string
  className?: string
  children?: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="xs"
            variant="ghost"
            aria-label={aria}
            className={`ml-1 h-4 px-1 font-mono text-xs text-muted-foreground ${className}`}
          />
        }
      >
        {children ?? `+${tokens.length}`}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {tokens.map((token) => (
          <DropdownMenuItem
            key={keyOf(token)}
            onClick={onJump(token)}
            className="font-mono text-xs"
          >
            {bare(token.name)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------ the tokens page */

type SheetProps = {
  tokens: Token[]
  sheet: SheetState
  onEdit: (token: Token, value: string) => void
}

/**
 * The state every surface shares: what has been typed and retyped, and which
 * token is in the editor. Both the tokens page and a component's panel drive the
 * same sheet, so the override map lives above both, in workbench.tsx.
 */
export function useSheet({
  tokens,
  overrides,
}: {
  tokens: Token[]
  overrides: Map<string, string>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [notations, setNotations] = useState<Map<string, Notation>>(new Map())
  const [types, setTypes] = useState<Map<string, string>>(new Map())
  const active = useActiveBlock()

  /** What a token is, as opposed to what its value looks like today: a type the
   * author picked outranks the one the value implies. */
  const typeOf = (token: Token) => types.get(keyOf(token)) ?? categoryOf(token)
  const valueOf = (token: Token) => overrides.get(keyOf(token)) ?? token.value

  const sections = buildSections(tokens, typeOf)

  const rowsOf = (section: Section): Row[] =>
    section.tokens.map((token): Row => ({
      token,
      type: typeOf(token),
      value: valueOf(token),
    }))

  const onType = (token: Token, category: string) =>
    setTypes((prev) => new Map(prev).set(keyOf(token), category))

  const onReset = () => {
    setNotations(new Map())
    setTypes(new Map())
    setSelected(null)
  }

  const find = (key: string | null) => {
    if (!key) return null
    for (const section of sections) {
      const row = rowsOf(section).find(
        (candidate) => keyOf(candidate.token) === key
      )
      if (row) return row
    }
    return null
  }

  // Arriving on an empty editor reads as broken, so the first real token of the
  // first section is what the editor opens on.
  const first = rowsOf(sections[0])[0] ?? null
  const selectedRow = find(selected) ?? first

  return {
    sections,
    rowsOf,
    selected,
    onSelect: setSelected,
    onType,
    selectedRow,
    valueOf,
    typeOf,
    active,
    /** Worth discarding even though it writes nothing, since an alias takes its
     * type from whatever it points at. */
    retyped: types.size,
    onReset,
    notationOf: (token: Token, value: string) =>
      // Null for a notation this does not read, such as oklch, which is not one
      // to offer in the dropdown.
      notations.get(keyOf(token)) ?? detectNotation(value) ?? "hex",
    onNotation: (token: Token, notation: Notation) =>
      setNotations((prev) => new Map(prev).set(keyOf(token), notation)),
  }
}

export type SheetState = ReturnType<typeof useSheet>

/**
 * The tokens page: the editor for the selected token pinned to the top, one way
 * to add another below it, and every declaration in one column. The file's own
 * text lives in the right rail beside this, not down here.
 */
export function TokenSheet({ tokens, sheet, onEdit }: SheetProps) {
  return (
    <div className="space-y-6">
      {/* `-mt` as well as `-mx`, so the block starts under the header instead of
          below the page's padding: without it the editor sat 24px lower until the
          first scroll, which read as it shrinking. Opaque, and with no padding
          above it, so the rows sliding underneath cannot show through. */}
      <div className="sticky top-14 z-20 -mx-4 -mt-4 border-b bg-background px-4 pt-2 pb-3 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pb-4">
        {sheet.selectedRow ? (
          <Editor {...editorProps(tokens, sheet, onEdit, sheet.selectedRow)} />
        ) : (
          <p className="text-xs text-muted-foreground">No tokens to edit.</p>
        )}
      </div>

      <div className="space-y-6">
        {sheet.sections.map((section) => (
          <TokenGroup
            key={section.id}
            section={section}
            rows={sheet.rowsOf(section)}
            selectedKey={keyOf(sheet.selectedRow?.token)}
            sheet={sheet}
          />
        ))}
      </div>
    </div>
  )
}

/** A group of rows under one heading. Both surfaces group the same way, so the
 * heading and the row callbacks are written once. */
function TokenGroup({
  section,
  rows,
  selectedKey,
  sheet,
}: {
  section: Section
  rows: Row[]
  /** The row in the editor, so every group can mark it without holding it. */
  selectedKey: string | null
  sheet: SheetState
}) {
  return (
    <section id={section.id} className="scroll-mt-64 space-y-2">
      {/* Baselines, not centres: the label is in the heading face and the hint in
          the body face, and centring two different faces leaves one high. */}
      <div className="flex items-baseline gap-2">
        <h2 className="font-heading text-sm font-medium">{section.label}</h2>
        <span className="text-xs text-muted-foreground">{section.hint}</span>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>

      <div>
        {rows.map((row) => (
          <LedgerRow
            key={keyOf(row.token)}
            row={row}
            active={keyOf(row.token) === selectedKey}
            onSelect={() => sheet.onSelect(keyOf(row.token))}
          />
        ))}
      </div>
    </section>
  )
}

/* -------------------------------------------------- what a component is using */

/**
 * A component or page, with the tokens its whole import tree touches docked
 * underneath. The editor is in the panel rather than above the component, so the
 * component keeps the top of the window and a value can still be changed while it
 * is on screen.
 */
export function UsedByPanel({
  tokens,
  entry,
  sheet,
  onEdit,
  padded = true,
  children,
}: {
  tokens: Token[]
  entry: string
  sheet: SheetState
  onEdit: (token: Token, value: string) => void
  /** A page is judged at the width it will run at, so it gets no padding. */
  padded?: boolean
  /** The component itself. */
  children: ReactNode
}) {
  const [open, setOpen] = useState(true)
  const active = useActiveBlock()
  const usage = useMemo(
    () => usedTokens(SOURCES, entry, tokens, ALIAS_BASE),
    [entry, tokens]
  )

  // A name the walk found is a declaration in the block on screen: forty tokens
  // exist in both `:root` and `.dark`, and listing the light one in dark mode
  // shows a palette nobody is looking at.
  const used = [...usage.found.keys()]
    .map((name) => resolveToken(name, undefined, tokens, active))
    .filter((token): token is Token => token !== undefined)

  // A radius built from another radius changes nothing on its own, so what it is
  // built on is listed beside it, and so is everything that reads it: a change
  // here lands on those, and the editor's own "read by" links have to land
  // somewhere.
  const groups = buildSections(
    withRelated(used, tokens, active),
    sheet.typeOf
  ).map((section) => ({
    section,
    rows: section.tokens.map((token): Row => ({
      token,
      type: sheet.typeOf(token),
      value: sheet.valueOf(token),
    })),
  }))
  const rows = groups.flatMap((group) => group.rows)
  const selectedRow =
    rows.find((row) => keyOf(row.token) === sheet.selected) ?? rows[0] ?? null

  return (
    // The header is 56px above this, so a whole viewport here is a whole viewport
    // of page. Saying `min-h-svh` instead leaves every short page one header
    // taller than the window, and a scrollbar for it.
    <div className="flex min-h-[calc(100svh-var(--wb-header,3.5rem))] flex-col">
      <div className={`min-h-0 flex-1 ${padded ? "p-4 sm:p-6" : ""}`}>
        {children}
      </div>

      {/* A height of its own, `overscroll-contain` and no scrollbar: the list
          scrolls here, reaching its end stops here rather than dragging the page
          above along with it, and the rows get the width the panel is. */}
      <div className="sticky bottom-0 z-20 flex flex-col border-t bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2.5 px-4 py-1.5 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              open ? "Hide the tokens it uses" : "Show the tokens it uses"
            }
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? (
              <PanelBottomClose aria-hidden />
            ) : (
              <PanelBottomOpen aria-hidden />
            )}
          </Button>
          <span className="text-xs text-muted-foreground">
            {rows.length} token{rows.length === 1 ? "" : "s"}
          </span>
        </div>

        {open && (
          <div className="flex h-[60vh] min-h-72 shrink-0 flex-col border-t sm:h-[45vh] sm:min-h-56">
            {/* The editor holds the top of the panel and the list scrolls under it,
                instead of the editor scrolling away with the list. Its height is
                stated, so the list gets the same room whatever token is open. */}
            {selectedRow && (
              <div className="shrink-0 border-b px-4 py-3 sm:px-6">
                <Editor {...editorProps(tokens, sheet, onEdit, selectedRow)} />
              </div>
            )}

            <div className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nothing found. The walk reads <code>var(--x)</code> and
                  Tailwind class names, so a value built in JavaScript will not
                  show up.
                </p>
              ) : (
                groups.map((group) => (
                  <TokenGroup
                    key={group.section.id}
                    section={group.section}
                    rows={group.rows}
                    selectedKey={keyOf(selectedRow?.token)}
                    sheet={sheet}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** The one animation the motion specimen needs, mounted once by the shell. */
export const SPECIMEN_STYLE = `@keyframes wb-specimen-slide {
  from { left: 0 }
  to { left: calc(100% - 1rem) }
}`
