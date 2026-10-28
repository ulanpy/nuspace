/**
 * How the events board is laid out and how each poster hangs on it. Pure, so
 * the board looks the same on every visit and every device, and so the parts
 * that must not move (a poster's tilt, the column it sits in) can be tested.
 */

export type PosterMount = "pin" | "tape" | "corners"

/** How one poster hangs. Everything here comes from the event's id. */
export interface PosterHang {
  /** The resting tilt, in degrees. */
  rotation: number
  /** How strongly the poster swings when the page scrolls; signed. */
  swing: number
  mount: PosterMount
  pinColor: string
  /** Where along the top edge the pin or tape sits, as a percentage. */
  pinX: number
  /** Drift from the poster's grid slot, in px. */
  offsetX: number
  offsetY: number
}

export const PIN_COLORS: readonly string[] = [
  "#e5484d",
  "#3b82f6",
  "#f5b800",
  "#2fa84f",
  "#f4f4f5",
  "#a855f7",
]

/** A stable number for a number, so a poster hangs the same way every visit. */
function hash(value: number): number {
  let result = 2166136261
  for (const char of `event-${value}`) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return result >>> 0
}

/** A seeded generator: the same seed gives the same sequence. */
function random(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hangPoster(eventId: number): PosterHang {
  const next = random(hash(eventId))
  const roll = next()
  const mount: PosterMount =
    roll < 0.55 ? "pin" : roll < 0.78 ? "tape" : "corners"
  // Taped at both corners, a poster cannot swing or tilt much.
  const flatten = mount === "corners" ? 0.35 : 1
  const direction = next() > 0.5 ? 1 : -1
  const looseness = mount === "pin" ? 1 : mount === "tape" ? 0.5 : 0.2

  return {
    rotation: (next() - 0.5) * 7 * flatten,
    swing: direction * (0.6 + next() * 0.6) * looseness,
    mount,
    pinColor: PIN_COLORS[Math.floor(next() * PIN_COLORS.length)],
    pinX: 36 + next() * 28,
    offsetX: (next() - 0.5) * 14,
    offsetY: next() * 12,
  }
}

/** The 3:4 flyer, in units of the poster's width. */
const FLYER_HEIGHT = 4 / 3
/** Date line, place line and padding under the flyer. */
const CAPTION_BASE = 0.4
const CAPTION_LINE = 0.13
const TITLE_CHARS_PER_LINE = 20
const TITLE_MAX_LINES = 3

/**
 * A poster's height in units of its width, known before its image arrives.
 * The flyer is a fixed 3:4, so only the title's line count varies; it is
 * clamped on the poster, so the estimate is too.
 */
export function estimatePosterHeight(name: string): number {
  const lines = Math.min(
    TITLE_MAX_LINES,
    Math.max(1, Math.ceil(name.length / TITLE_CHARS_PER_LINE))
  )
  return FLYER_HEIGHT + CAPTION_BASE + lines * CAPTION_LINE
}

/**
 * The column each poster goes in: always the shortest so far, the leftmost on
 * a tie. A poster's column depends only on the posters before it, so appending
 * a page (or the ghosts that stand in for it) never moves a poster already on
 * the board.
 */
export function assignColumns(
  heights: readonly number[],
  columnCount: number
): number[] {
  const filled = Array.from({ length: Math.max(1, columnCount) }, () => 0)
  return heights.map((height) => {
    let shortest = 0
    for (let column = 1; column < filled.length; column++) {
      if (filled[column] < filled[shortest] - 1e-6) shortest = column
    }
    filled[shortest] += height
    return shortest
  })
}
