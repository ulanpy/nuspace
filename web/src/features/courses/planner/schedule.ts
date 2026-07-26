/**
 * Schedule-builder domain logic, extracted from the old 1,837-line tab.
 *
 * Everything here is pure and works on plain data so the grid, the agenda and
 * the section pickers can share one interpretation of a section. The registrar
 * hands us `days` and `times` as display strings ("MWF", "9:00 AM - 9:50 AM"),
 * so parsing them is unavoidable — but it happens once, here.
 */
import type { PlannerCourse, PlannerSection } from "./types"

/** A section placed on the calendar, with the course it belongs to. */
export interface SectionEvent {
  course: PlannerCourse
  section: PlannerSection
}

export interface DayDef {
  /** The letter the registrar uses inside `section.days`. */
  key: string
  label: string
}

/**
 * Registrar day letters. `R` is Thursday and `S` is Saturday — the scheme
 * exists so every weekday is one character, which is also why `days` can be
 * read as a plain string of letters.
 */
export const DAYS: readonly DayDef[] = [
  { key: "M", label: "Mon" },
  { key: "T", label: "Tue" },
  { key: "W", label: "Wed" },
  { key: "R", label: "Thu" },
  { key: "F", label: "Fri" },
  { key: "S", label: "Sat" },
]

const DAY_KEYS = new Set(DAYS.map((day) => day.key))

/**
 * The day letters of a section, ignoring anything not a known day.
 *
 * The field is a plain string of letters, but a section whose meetings were
 * merged comes back as `"W / M"` — filtering to known letters handles both
 * without the caller needing to know which shape it got.
 */
export function sectionDays(section: PlannerSection): string[] {
  return section.days.split("").filter((char) => DAY_KEYS.has(char))
}

/**
 * Day letters as readable labels, in week order.
 *
 * `"W / M"` has to become "Mon, Wed" before it's shown — both because the
 * separator is an artifact and because the registrar's order isn't the week's.
 */
export function formatDays(section: PlannerSection): string {
  const days = new Set(sectionDays(section))
  return DAYS.filter((day) => days.has(day.key))
    .map((day) => day.label)
    .join(", ")
}

/**
 * Minutes since midnight for a registrar clock time, or null if unparseable.
 *
 * Some sections carry "TBA" or an empty string instead of a time; those must
 * fall out rather than land at midnight on the grid.
 */
export function parseTime(value: string): number | null {
  const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(value)
  if (!match) return null

  const [, rawHour, rawMinute, meridiem] = match
  const hour12 = Number(rawHour) % 12
  const hour = meridiem.toUpperCase() === "AM" ? hour12 : hour12 + 12

  return hour * 60 + Number(rawMinute)
}

/** `"9:00 AM - 9:50 AM"` → `[540, 590]`. Either end may be null. */
export function parseTimeRange(value: string): [number | null, number | null] {
  if (!value.includes("-")) return [null, null]

  const [start, end] = value.split("-")
  return [parseTime(start.trim()), parseTime(end.trim())]
}

/** `13` → `"1 PM"`. */
export function formatHour(hour: number): string {
  return `${String(((hour + 11) % 12) + 1)} ${hour >= 12 ? "PM" : "AM"}`
}

/** Events that have a real time range, i.e. the ones the grid can place. */
export function timedEvents(events: readonly SectionEvent[]): SectionEvent[] {
  return events.filter(({ section }) => {
    const [start, end] = parseTimeRange(section.times)
    return start !== null && end !== null
  })
}

/**
 * The hour range the grid must span.
 *
 * Defaults to the standard campus day but widens to fit anything outside it,
 * so an unusual evening section is drawn rather than silently clipped.
 */
export function gridHours(events: readonly SectionEvent[]): {
  startHour: number
  endHour: number
} {
  let earliest = 8 * 60
  let latest = 22 * 60

  for (const { section } of events) {
    const [start, end] = parseTimeRange(section.times)
    if (start !== null) earliest = Math.min(earliest, start)
    if (end !== null) latest = Math.max(latest, end)
  }

  return {
    startHour: Math.floor(earliest / 60),
    endHour: Math.ceil(latest / 60),
  }
}

/**
 * Ids of sections that overlap another section on a shared day.
 *
 * Both sides of an overlap are returned, since the grid highlights the whole
 * collision rather than blaming whichever one happened to be added second.
 * Touching intervals don't clash: a class ending at 9:50 and one starting at
 * 9:50 are back to back, which is normal.
 */
export function findClashes(events: readonly SectionEvent[]): Set<number> {
  const clashes = new Set<number>()
  const byDay = new Map<string, { start: number; end: number; id: number }[]>()

  for (const { section } of events) {
    const [start, end] = parseTimeRange(section.times)
    if (start === null || end === null) continue

    for (const day of sectionDays(section)) {
      const placed = byDay.get(day) ?? []

      for (const other of placed) {
        if (start < other.end && end > other.start) {
          clashes.add(section.id)
          clashes.add(other.id)
        }
      }

      placed.push({ start, end, id: section.id })
      byDay.set(day, placed)
    }
  }

  return clashes
}

/** A block positioned within one day column. */
export interface PlacedBlock {
  event: SectionEvent
  /** Minutes since midnight. */
  start: number
  end: number
  /** Which sub-column this block occupies, and how many exist beside it. */
  lane: number
  lanes: number
}

/**
 * Lay one day's blocks out side by side where they overlap.
 *
 * Without this, two sections at the same hour are drawn at identical
 * coordinates and the one rendered first is completely hidden behind the
 * second — so a conflict shows up as a single block with nothing visibly wrong
 * with it, which is precisely the case the grid exists to reveal.
 *
 * Blocks are grouped into runs of mutually overlapping sections, and each run
 * is split into as many lanes as it needs. Non-overlapping blocks keep the
 * full column width, so a normal schedule looks no narrower for it.
 */
export function layoutDay(
  events: readonly SectionEvent[],
  dayKey: string
): PlacedBlock[] {
  const blocks = events
    .filter(({ section }) => sectionDays(section).includes(dayKey))
    .flatMap((event) => {
      const [start, end] = parseTimeRange(event.section.times)
      return start === null || end === null ? [] : [{ event, start, end }]
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const placed: PlacedBlock[] = []
  let cluster: PlacedBlock[] = []
  /** When each open lane frees up, so a lane can be reused down the day. */
  let laneEnds: number[] = []
  // The latest end time in the open cluster: a block starting at or after it
  // overlaps nothing before it, which is where one cluster ends and the next
  // begins.
  let clusterEnd = -Infinity

  const closeCluster = () => {
    for (const block of cluster) block.lanes = laneEnds.length
    placed.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const { event, start, end } of blocks) {
    if (start >= clusterEnd) closeCluster()
    clusterEnd = Math.max(clusterEnd, end)

    // Reuse the first lane that has already ended; a 9–10 and a 10–11 stack in
    // one lane rather than splitting the column in half all morning.
    const free = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    const lane = free === -1 ? laneEnds.length : free
    laneEnds[lane] = end

    cluster.push({ event, start, end, lane, lanes: 1 })
  }
  closeCluster()

  return placed
}

/** Weekend columns are dropped when empty so weekdays get the width. */
export function visibleDays(events: readonly SectionEvent[]): DayDef[] {
  const used = new Set(events.flatMap(sectionDaysOf))
  return DAYS.filter((day) => day.key !== "S" || used.has("S"))
}

function sectionDaysOf({ section }: SectionEvent): string[] {
  return sectionDays(section)
}

/**
 * How contested a section is, as demand over capacity.
 *
 * `selected_count` is how many Nuspace users planned it and
 * `enrollment_snapshot` is the registrar's own number; the larger wins, since
 * either alone understates demand. Returns 0 when capacity is unknown — an
 * unknown denominator should read as "no signal", not as "wide open".
 */
export function demandRatio(section: PlannerSection): number {
  const capacity = section.capacity ?? 0
  if (!Number.isFinite(capacity) || capacity <= 0) return 0

  const demand = Math.max(
    section.selected_count,
    section.enrollment_snapshot ?? 0
  )
  return demand / capacity
}

export type DemandLevel = "low" | "moderate" | "high" | "full"

export function demandLevel(ratio: number): DemandLevel {
  if (ratio >= 1) return "full"
  if (ratio >= 0.75) return "high"
  if (ratio >= 0.5) return "moderate"
  return "low"
}

export const DEMAND_LABEL: Record<DemandLevel, string> = {
  low: "Low demand",
  moderate: "Moderate demand",
  high: "High demand",
  full: "Over capacity",
}

/**
 * The kind of a section, from the letters in its code: `L1` → `L`.
 *
 * A course is registered as one of each kind, so this is what makes lecture
 * and lab independent choices rather than competing ones.
 */
export function sectionTypeKey(sectionCode: string | null | undefined): string {
  if (!sectionCode) return "SECTION"
  return sectionCode.replace(/[\d\s]+/g, "").toUpperCase() || "SECTION"
}

/**
 * Read from the codes the registrar actually publishes, not from guesswork.
 *
 * The previous app mapped `LAB`, `PBL` and `PBLV`, none of which occur in the
 * catalog — labs are `LB` (152 sections), so every lab in the app was headed
 * "LAB"-less and fell through to the raw key. Anything unmapped still renders
 * as its code, which is the right failure: a new type shows up as `WSH`
 * rather than disappearing.
 */
const SECTION_TYPE_LABELS: Record<string, string> = {
  L: "Lecture",
  S: "Seminar",
  LB: "Lab",
  R: "Recitation",
  T: "Tutorial",
  PLB: "Practice lab",
  CLB: "Computer lab",
  CHLB: "Chemistry lab",
  IS: "Independent study",
  INT: "Internship",
  P: "Practicum",
  WSH: "Workshop",
  CL: "Clinical",
  TH: "Thesis",
}

export function sectionTypeLabel(typeKey: string): string {
  return SECTION_TYPE_LABELS[typeKey] ?? typeKey
}

export interface SectionGroup {
  typeKey: string
  label: string
  sections: PlannerSection[]
}

/** Sections split by kind, in the order the registrar listed them. */
export function groupSectionsByType(
  sections: readonly PlannerSection[]
): SectionGroup[] {
  const groups = new Map<string, SectionGroup>()

  for (const section of sections) {
    const typeKey = sectionTypeKey(section.section_code)
    const group = groups.get(typeKey) ?? {
      typeKey,
      label: sectionTypeLabel(typeKey),
      sections: [],
    }
    group.sections.push(section)
    groups.set(typeKey, group)
  }

  return [...groups.values()]
}

/**
 * The selection after picking `sectionId` — it replaces the current choice of
 * its own kind and leaves the other kinds alone.
 *
 * The API takes the complete set of selected ids, not a delta, so choosing a
 * lab has to resend the lecture or the lecture is dropped.
 */
export function nextSectionSelection(
  sections: readonly PlannerSection[],
  sectionId: number
): number[] {
  const targetType = sectionTypeKey(
    sections.find((section) => section.id === sectionId)?.section_code
  )

  const kept = sections
    .filter(
      (section) =>
        section.is_selected &&
        sectionTypeKey(section.section_code) !== targetType
    )
    .map((section) => section.id)

  return kept.includes(sectionId) ? kept : [...kept, sectionId]
}

export interface SectionSelectionSnapshot {
  courseId: number
  sectionIds: number[]
}

interface SelectionSchedule {
  courses: readonly {
    id: number
    sections: readonly Pick<PlannerSection, "id" | "is_selected">[]
  }[]
}

export function selectionSnapshot(
  planner: SelectionSchedule
): SectionSelectionSnapshot[] {
  return planner.courses.map((course) => ({
    courseId: course.id,
    sectionIds: course.sections
      .filter((section) => section.is_selected)
      .map((section) => section.id),
  }))
}

/**
 * Cyrillic → Latin by keyboard position, then upper-cased.
 *
 * Students on a Russian or Kazakh layout type "сы" meaning "CS" and get
 * nothing back. Mapping by key position rather than by transliteration is what
 * makes that work: the letters aren't equivalent, the keys are. Kept from the
 * previous app, where it was easy to overlook and genuinely product-aware.
 */
const LAYOUT_MAP: Record<string, string> = {
  й: "q",
  ц: "w",
  у: "e",
  к: "r",
  е: "t",
  н: "y",
  г: "u",
  ш: "i",
  щ: "o",
  з: "p",
  х: "[",
  ъ: "]",
  ф: "a",
  ы: "s",
  в: "d",
  а: "f",
  п: "g",
  р: "h",
  о: "j",
  л: "k",
  д: "l",
  ж: ";",
  э: "'",
  я: "z",
  ч: "x",
  с: "c",
  м: "v",
  и: "b",
  т: "n",
  ь: "m",
  б: ",",
  ю: ".",
  // Kazakh-specific letters, positioned as on the Kazakh layout.
  ұ: "o",
  қ: "p",
  ө: "[",
  һ: "]",
  і: "b",
  ү: ",",
  ң: ".",
  ғ: "/",
}

export function normalizeCourseQuery(raw: string): string {
  return raw
    .replace(/./gu, (char) => LAYOUT_MAP[char.toLowerCase()] ?? char)
    .toUpperCase()
    .trim()
}

/**
 * Collapse the whitespace inside a registrar title.
 *
 * Titles come out of the PDF parser with embedded newlines mid-phrase
 * ("Being Human: An\nIntroduction to..."), which render as line breaks in the
 * middle of a card and wreck the layout.
 */
export function normalizeTitle(title: string | null | undefined): string {
  return title?.replace(/\s+/g, " ").trim() ?? ""
}

/**
 * Turn a registrar room string into something that fits on a card.
 *
 * Rooms arrive as `"2.141 -\ncap:28"`, and a section whose meetings were
 * merged gets them joined: `"online - cap:0 / 7E.429 -\ncap:90"`. The room
 * capacity is not the section capacity and is never what a student is looking
 * for here, so it's dropped; duplicates collapse because merged meetings are
 * usually in the same room.
 */
export function formatRoom(room: string | null | undefined): string {
  if (!room) return ""

  const rooms = room
    .replace(/\s*-\s*cap\s*:\s*\d+/gi, "")
    .split("/")
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)

  return [...new Set(rooms)].join(" / ")
}
