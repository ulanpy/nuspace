import type { CSSProperties } from "react"

/**
 * The board's fixed furniture: cork, wood and paper.
 *
 * These are the only colours in the product that are not theme tokens. A cork
 * board is a photograph of a material, and a token that changed with the theme
 * would stop it being one. Everything printed on the paper still uses ink
 * colours from the stone ramp, which reads the same on cream in both themes.
 */

const svgUrl = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const noise = (
  frequency: number,
  octaves: number,
  seed: number,
  matrix: string,
  size: number
) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<filter id='f' x='0' y='0' width='100%' height='100%'>` +
      `<feTurbulence type='fractalNoise' baseFrequency='${frequency}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/>` +
      `<feColorMatrix values='${matrix}'/></filter>` +
      `<rect width='100%' height='100%' filter='url(#f)'/></svg>`
  )

export const BOARD_CORK: CSSProperties = {
  backgroundColor: "#c4935d",
  backgroundImage: [
    "radial-gradient(120% 70% at 50% 0%, rgb(255 238 205 / 0.28), transparent 60%)",
    noise(
      0.035,
      2,
      4,
      "0 0 0 0 .42  0 0 0 0 .24  0 0 0 0 .08  0 0 0 .9 -.28",
      600
    ),
    noise(
      0.55,
      3,
      7,
      "0 0 0 0 .36  0 0 0 0 .2  0 0 0 0 .07  0 0 0 1.7 -.6",
      240
    ),
    noise(
      0.9,
      2,
      11,
      "0 0 0 0 .95  0 0 0 0 .74  0 0 0 0 .46  0 0 0 1.5 -.7",
      180
    ),
  ].join(", "),
  backgroundSize: "100% 100%, 600px 600px, 240px 240px, 180px 180px",
}

export const BOARD_FRAME: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 2px, transparent 2px 9px), linear-gradient(135deg, #94603a, #5a3720 70%)",
}

export const BOARD_GRAIN = noise(
  0.8,
  2,
  2,
  "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 0",
  160
)

/** Notebook paper: a red margin and faint blue rules. */
export const NOTE_LINED: CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, transparent 2rem, rgb(220 38 38 / 0.35) 2rem calc(2rem + 1px), transparent calc(2rem + 1px)), repeating-linear-gradient(to bottom, transparent 0 1.75rem, rgb(59 130 246 / 0.18) 1.75rem calc(1.75rem + 1px))",
}

/** The date ranges the board can be filtered to, in calendar order. */
export const PINBOARD_FILTERS = [
  { value: "upcoming", label: "All upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const

export type PinboardFilter = (typeof PINBOARD_FILTERS)[number]["value"]
