import { type CSSProperties, type ReactElement } from "react"
import {
  createUsePuck,
  type CustomField,
  type CustomFieldRender,
  type Fields,
  FieldLabel,
} from "@puckeditor/core"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ImageField,
  LimitedImageField,
} from "@/components/shared/page-editor/blocks/_shared"

// --- Fonts ---------------------------------------------------------------

export type Font = { label: string; value: string; category: string }

export const FONTS: Font[] = [
  // sans-serif
  { label: "Inter", value: "Inter", category: "sans-serif" },
  { label: "Onest", value: "Onest Variable", category: "sans-serif" },
  { label: "Roboto", value: "Roboto", category: "sans-serif" },
  { label: "Open Sans", value: "Open Sans", category: "sans-serif" },
  { label: "Lato", value: "Lato", category: "sans-serif" },
  { label: "Montserrat", value: "Montserrat", category: "sans-serif" },
  { label: "Poppins", value: "Poppins", category: "sans-serif" },
  // serif
  { label: "Merriweather", value: "Merriweather", category: "serif" },
  { label: "Playfair Display", value: "Playfair Display", category: "serif" },
  { label: "Lora", value: "Lora", category: "serif" },
  // monospace
  { label: "JetBrains Mono", value: "JetBrains Mono", category: "monospace" },
  // handwritten
  { label: "Caveat", value: "Caveat", category: "handwritten" },
  { label: "Pacifico", value: "Pacifico", category: "handwritten" },
  { label: "Dancing Script", value: "Dancing Script", category: "handwritten" },
]

/**
 * Block-level font choices. The empty "Default" option means "follow the page
 * default font" set on the root config.
 */
export const fontOptions = [
  { label: "Default", value: "" },
  ...FONTS.map(({ label, value }) => ({ label, value, fontFamily: value })),
]

// --- Border radius --------------------------------------------------------

/**
 * Block-level radius choices. The empty "Default" option means "follow the
 * page default radius" set on the root config.
 */
export const radiusOptions = [
  { label: "Default", value: "" },
  { label: "0px", value: "0px" },
  { label: "8px", value: "8px" },
  { label: "12px", value: "12px" },
  { label: "16px", value: "16px" },
  { label: "24px", value: "24px" },
  { label: "32px", value: "32px" },
]

/**
 * Root-level font/radius choices. The root config has nothing to inherit from,
 * so there is no empty-default entry here — every option is a concrete value.
 */
export const rootFontOptions = FONTS.map(({ label, value }) => ({
  label,
  value,
  fontFamily: value,
}))

export const rootRadiusOptions = radiusOptions.filter(
  (option) => option.value !== ""
)

// --- Shared style props ---------------------------------------------------

export type ComponentStyleProps = {
  textColor?: string
  backgroundColor?: string
  /** A "12px"-style value; empty string means the page default radius. */
  radius?: string
  fontFamily?: string
}

/**
 * Resolves a radius value to a usable CSS border-radius. Accepts both the new
 * "12px" string values and legacy numeric values stored by earlier versions.
 */
export function resolveRadius(
  radius?: string | number,
  fallback = "var(--nuspace-radius, 12px)"
): string {
  if (typeof radius === "number") return `${radius}px`
  return radius || fallback
}

/**
 * Builds the CSS style for a component from its style fields. Empty values
 * fall back to the page defaults: color and font cascade naturally from the
 * root, and the radius falls back to the `--nuspace-radius` variable set by
 * the root config.
 */
export function getComponentStyle(
  props: Partial<ComponentStyleProps>
): CSSProperties {
  return {
    color: props.textColor || undefined,
    backgroundColor: props.backgroundColor || undefined,
    borderRadius: resolveRadius(props.radius),
    fontFamily: props.fontFamily || undefined,
  }
}

/** Pick a readable neutral text color (black/white) for a hex background. */
export function contrastColor(backgroundColor: string): string {
  const hex = (backgroundColor ?? "").replace("#", "")
  if (hex.length !== 6) return "#0f172a"
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? "#0f172a" : "#f8fafc"
}

// --- Custom field render functions ----------------------------------------

type CustomRenderParams<Value> = Parameters<CustomFieldRender<Value>>[0]

const usePuck = createUsePuck()

const colorSwatchStyle: CSSProperties = {
  height: 28,
  width: 48,
  border: "1px solid var(--puck-field-color-border)",
  borderRadius: "var(--puck-field-radius)",
  padding: 2,
  background: "transparent",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
}

/**
 * The root config's default global typography color. It only affects the
 * Typography blocks (Heading, Text, RichText) — controls like buttons pick
 * their label color from the page background / Main color instead, so they
 * never inherit this literal.
 */
export const DEFAULT_TEXT_COLOR = "#0f172a"

/** Fallbacks used when the root config has no value for a color prop. */
const ROOT_COLOR_FALLBACKS: Record<string, string> = {
  textColor: DEFAULT_TEXT_COLOR,
  accentColor: "#1d4ed8",
}

function rootColor(
  rootProps: Record<string, unknown>,
  name: string
): string | undefined {
  const value = rootProps[name]
  return typeof value === "string" && value ? value : ROOT_COLOR_FALLBACKS[name]
}

/**
 * The effective color behind the "Default" state:
 * - A field can override with `defaultColor`: `"transparent"` (no fill),
 *   `"accent"` (the page Main color), or a concrete hex.
 * - Without an override, colors inherit from their matching page root color
 *   EXCEPT backgrounds, which inherit the Main (accent) color — not the page
 *   background color, which would be invisible on the page.
 * Returns `null` for transparent. Falls back to a neutral when nothing is set.
 */
function resolveDefaultColor(
  name: string,
  rootProps: Record<string, unknown>,
  defaultColor?: string
): string | null {
  if (defaultColor === "transparent") return null
  if (defaultColor === "accent")
    return rootColor(rootProps, "accentColor") ?? "#1d4ed8"
  if (defaultColor) return defaultColor
  if (name === "backgroundColor") {
    return rootColor(rootProps, "accentColor") ?? "#1d4ed8"
  }
  return rootColor(rootProps, name) ?? "#ffffff"
}

export function ColorField({
  field,
  name,
  value,
  onChange,
  readOnly,
}: CustomRenderParams<string | undefined>): ReactElement {
  const { allowReset = true, defaultColor } =
    (field as CustomField<string | undefined> & {
      allowReset?: boolean
      defaultColor?: string
    }) ?? {}
  const rootProps = usePuck((state) => state.appState.data.root?.props) ?? {}
  const pendingDefault = resolveDefaultColor(name, rootProps, defaultColor)
  const resolved = (value || pendingDefault) ?? "#ffffff"
  const isDefault = !value
  const isTransparent = isDefault && pendingDefault === null
  return (
    <FieldLabel label={field?.label ?? name} readOnly={readOnly}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label
          style={colorSwatchStyle}
          title={
            value
              ? value
              : isTransparent
                ? "Default: transparent"
                : `Default: ${resolved}`
          }
        >
          <span
            style={{
              position: "absolute",
              inset: 2,
              borderRadius: "calc(var(--puck-field-radius) - 2px)",
              background: isTransparent ? "transparent" : resolved,
              border: isDefault
                ? "1px dashed var(--puck-color-border)"
                : "none",
              display: "block",
            }}
          />
          <input
            type="color"
            aria-label={field?.label ?? name}
            value={resolved}
            disabled={readOnly}
            onChange={(event) => onChange(event.currentTarget.value)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer",
            }}
          />
        </label>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{ fontSize: 12, color: "var(--puck-color-text-secondary)" }}
          >
            {isDefault ? "Default" : value}
          </span>
          {isDefault && (
            <span
              style={{
                fontSize: 10,
                color: "var(--puck-color-text-subtle)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {isTransparent ? "transparent" : resolved}
            </span>
          )}
        </span>
        {allowReset && !readOnly && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={isDefault}
            onClick={() => onChange(undefined)}
          >
            Default
          </Button>
        )}
      </div>
    </FieldLabel>
  )
}

/**
 * Body text sizes shared by the Text and RichText blocks. Sizes are plain
 * pixel values; RichText headings scale from the chosen size via `em`.
 */
export const textSizeOptions = [
  { label: "S", value: "s" },
  { label: "M", value: "m" },
  { label: "L", value: "l" },
] as const

export type TextSize = "s" | "m" | "l"

export function textSizePx(size?: TextSize): number {
  return size === "s" ? 16 : size === "l" ? 24 : 20
}

/**
 * Focal positions, laid out as a 3x3 plus: top / middle / bottom in the middle
 * column and left / center / right in the middle row. Corner positions are
 * dropped because the image always fits the frame by width — the corners don't
 * represent a cropped region the way the edge midpoints do.
 */
const FOCAL_POINTS: (string | null)[] = [
  null,
  "50% 0%",
  null,
  "0% 50%",
  "50% 50%",
  "100% 50%",
  null,
  "50% 100%",
  null,
]

export function FocalPointField({
  field,
  name,
  value,
  onChange,
  readOnly,
}: {
  field?: { label?: string }
  name: string
  value: string | undefined
  onChange: (value: string) => void
  readOnly?: boolean
}): ReactElement {
  return (
    <FieldLabel label={field?.label ?? name} readOnly={readOnly}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 28px)",
          gap: 4,
        }}
      >
        {FOCAL_POINTS.map((point, index) => {
          if (!point) {
            return <span key={index} aria-hidden />
          }
          const active = (value || "50% 50%") === point
          const focalLabel =
            ["", "Top", "", "Left", "Center", "Right", "", "Bottom"][index] ??
            "Center"
          return (
            <Button
              key={point}
              type="button"
              variant={active ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={`Focus point ${focalLabel}`}
              aria-pressed={active}
              disabled={readOnly}
              onClick={() => onChange(point)}
              style={{ padding: 0 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active
                    ? "var(--puck-color-interactive)"
                    : "var(--puck-color-text-subtle)",
                }}
                aria-hidden
              />
            </Button>
          )
        })}
      </div>
    </FieldLabel>
  )
}

export type Option<Value = string> = {
  label: string
  value: Value
  /** When set, the option is rendered in this font family (used by font pickers). */
  fontFamily?: string
}

/**
 * Renders a shadcn Select (Base UI) instead of Puck's native select so the
 * editor controls match the rest of the app. Works for single and union string
 * values and supports an empty-string "inherit"-style option.
 */
export function OptionsField<Value extends string | number | undefined>({
  field,
  name,
  value,
  onChange,
  readOnly,
  options,
}: CustomRenderParams<Value> & {
  options: readonly Option<Exclude<Value, undefined>>[]
}): ReactElement {
  const emptyOption = options.find((option) => option.value === "")
  return (
    <FieldLabel label={field?.label ?? name} readOnly={readOnly}>
      <Select
        value={value ?? null}
        items={options}
        disabled={readOnly}
        onValueChange={(next) => {
          if (next !== null) onChange(next)
        }}
      >
        <SelectTrigger className="w-full" size="sm">
          <SelectValue placeholder={emptyOption?.label ?? "Select…"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={String(option.value)}
              value={option.value}
              style={
                option.fontFamily
                  ? { fontFamily: option.fontFamily }
                  : undefined
              }
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldLabel>
  )
}

/**
 * Builds a shadcn Select-based field labelled `label` with the given options.
 * An empty-string option (when present) reads as "Default". `Value` should be
 * the component prop type exactly as seen by Puck's `Fields` (i.e. `| undefined`
 * for optional props) so the field slots into the prop type.
 */
export function optionsField<Value extends string | number | undefined>(
  label: string,
  options: readonly Option<Exclude<Value, undefined>>[]
): CustomField<Value> {
  return {
    type: "custom",
    label,
    render: (props) => <OptionsField {...props} options={options} />,
  }
}

// --- Field builders -------------------------------------------------------

/**
 * Per-component style controls (text color, background color, border radius,
 * font). Values default to the page-level settings from the root config. Pass
 * `text: false` for media blocks that have no text of their own.
 *
 * `backgroundDefault` pins what a block's background "Default" resolves to:
 * `"transparent"` for blocks that render no fill by default, `"accent"` for
 * blocks whose default fill is the page Main color, or a concrete hex. When
 * omitted the background inherits the page Main color.
 */
export function styleFields(options?: {
  background?: boolean
  backgroundDefault?: string
  backgroundLabel?: string
  font?: boolean
  text?: boolean
}): Partial<Fields<ComponentStyleProps>> {
  const {
    background = true,
    backgroundDefault,
    backgroundLabel,
    font = true,
    text = true,
  } = options ?? {}
  return {
    ...(text
      ? {
          textColor: {
            type: "custom" as const,
            label: "Text color",
            render: ColorField,
          },
        }
      : {}),
    ...(background
      ? {
          backgroundColor: {
            type: "custom" as const,
            label: backgroundLabel ?? "Background color",
            render: ColorField,
            ...(backgroundDefault ? { defaultColor: backgroundDefault } : {}),
          },
        }
      : {}),
    radius: optionsField<ComponentStyleProps["radius"] | undefined>(
      "Border radius",
      radiusOptions
    ),
    ...(font
      ? {
          fontFamily: optionsField<string | undefined>("Font", fontOptions),
        }
      : {}),
  }
}

export const aspectRatioOptions = [
  { label: "Original", value: "original" },
  { label: "Horizontal (4:3)", value: "4/3" },
  { label: "Vertical (3:4)", value: "3/4" },
  { label: "Square (1:1)", value: "1/1" },
  { label: "Circle", value: "circle" },
] as const

export type PhotoFields = {
  image: string
  alt: string
  aspectRatio: "original" | "4/3" | "3/4" | "1/1" | "circle"
  focalPoint: string
}

/**
 * The image edit controls shared by the standalone Image block and the Hero
 * image: upload, alt text, aspect ratio and focal point. `urlField` names the
 * key written by the upload control (Image stores it under `image`, the Hero
 * under `url`). The focal control keeps the plus (top/bottom + left/center/
 * right) with the corners removed, since images fit the frame by width.
 */
export function photoFields(options: {
  limited?: boolean
  urlField: "url"
}): Fields<Partial<Omit<PhotoFields, "image">> & { url?: string }>
export function photoFields(options?: {
  limited?: boolean
  urlField?: "image"
}): Fields<PhotoFields>
export function photoFields(options?: {
  limited?: boolean
  urlField?: "image" | "url"
}):
  | Fields<PhotoFields>
  | Fields<Partial<Omit<PhotoFields, "image">> & { url?: string }> {
  const { limited = false, urlField = "image" } = options ?? {}
  const upload = {
    type: "custom" as const,
    label: "Image",
    render: limited ? LimitedImageField : ImageField,
  }
  const common = {
    alt: { type: "text" as const, label: "Alt text" },
    focalPoint: {
      type: "custom" as const,
      label: "Focal point",
      render: FocalPointField,
    },
  }
  if (urlField === "url") {
    return {
      ...common,
      url: upload,
      aspectRatio: optionsField<PhotoFields["aspectRatio"] | undefined>(
        "Aspect ratio",
        aspectRatioOptions
      ),
    }
  }
  return {
    ...common,
    image: upload,
    aspectRatio: optionsField<PhotoFields["aspectRatio"]>(
      "Aspect ratio",
      aspectRatioOptions
    ),
  }
}
