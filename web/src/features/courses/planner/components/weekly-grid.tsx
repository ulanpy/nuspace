import { cn } from "@/lib/utils"

import {
  DEMAND_LABEL,
  demandLevel,
  demandRatio,
  findClashes,
  formatHour,
  formatRoom,
  gridHours,
  layoutDay,
  normalizeTitle,
  parseTimeRange,
  sectionDays,
  timedEvents,
  visibleDays,
  type DemandLevel,
  type SectionEvent,
} from "../schedule"

/** One hour of grid height. Enough for a 50-minute block to show three lines. */
const HOUR_HEIGHT = 84

/**
 * Colour by how contested a section is, so a schedule that looks fine but is
 * unregisterable reads as a problem before registration day rather than on it.
 */
const DEMAND_CLASSES: Record<DemandLevel, string> = {
  low: "bg-secondary/60 text-secondary-foreground hover:bg-secondary/80",
  moderate: "bg-primary/25 text-foreground hover:bg-primary/35",
  high: "bg-warning/30 text-foreground hover:bg-warning/40",
  full: "bg-destructive/25 text-foreground hover:bg-destructive/35",
}

interface BlockProps {
  event: SectionEvent
  isClashing: boolean
  onSelect: (event: SectionEvent) => void
}

function blockLabel({ course, section }: SectionEvent, isClashing: boolean) {
  const ratio = demandRatio(section)
  const demand = DEMAND_LABEL[demandLevel(ratio)]

  return [
    `${course.course_code} ${section.section_code}`,
    section.times,
    formatRoom(section.room),
    demand,
    isClashing ? "Conflicts with another section" : null,
  ]
    .filter(Boolean)
    .join(", ")
}

function ScheduleBlock({ event, isClashing, onSelect }: BlockProps) {
  const { course, section } = event

  return (
    <button
      type="button"
      onClick={() => {
        onSelect(event)
      }}
      aria-label={blockLabel(event, isClashing)}
      className={cn(
        "absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] font-semibold shadow transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isClashing
          ? "bg-destructive text-destructive-foreground ring-2 ring-destructive"
          : DEMAND_CLASSES[demandLevel(demandRatio(section))]
      )}
    >
      <span className="block truncate">{course.course_code}</span>
      <span className="block truncate font-normal opacity-80">
        {section.section_code}
        {formatRoom(section.room) && ` · ${formatRoom(section.room)}`}
      </span>
    </button>
  )
}

interface WeeklyGridProps {
  events: readonly SectionEvent[]
  onSelect: (event: SectionEvent) => void
}

/**
 * The week as an absolute-positioned overlay on an hour grid.
 *
 * Blocks are placed by offset rather than laid out in CSS grid rows because
 * classes don't align to the hour: a 9:00–9:50 and a 9:30–10:45 have to sit at
 * their real coordinates. Where they overlap, `layoutDay` splits the column so
 * both stay visible — a conflict the student can't see is worse than useless.
 */
export function WeeklyGrid({ events, onSelect }: WeeklyGridProps) {
  const placed = timedEvents(events)
  const clashes = findClashes(placed)
  const days = visibleDays(placed)
  const { startHour, endHour } = gridHours(placed)

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, index) => startHour + index
  )
  const columns = `4rem repeat(${String(days.length)}, minmax(7.5rem, 1fr))`

  return (
    <div className="overflow-x-auto rounded-xl border bg-muted/10 p-3">
      <div style={{ minWidth: 64 + days.length * 120 }}>
        <div
          className="grid gap-2 text-xs font-semibold text-muted-foreground"
          style={{ gridTemplateColumns: columns }}
        >
          <div />
          {days.map((day) => (
            <div key={day.key} className="text-center">
              {day.label}
            </div>
          ))}
        </div>

        <div
          className="relative mt-2 grid gap-2"
          style={{
            gridTemplateColumns: columns,
            height: hours.length * HOUR_HEIGHT,
          }}
        >
          <div className="flex flex-col text-right text-xs text-muted-foreground">
            {hours.map((hour) => (
              <div
                key={hour}
                className="border-t pr-2"
                style={{ height: HOUR_HEIGHT }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div key={day.key} className="relative border-l">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-t border-dashed"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {layoutDay(placed, day.key).map(
                ({ event, start, end, lane, lanes }) => (
                  <div
                    key={event.section.id}
                    className="absolute"
                    style={{
                      top: ((start - startHour * 60) / 60) * HOUR_HEIGHT,
                      height: ((end - start) / 60) * HOUR_HEIGHT,
                      left: `${String((lane / lanes) * 100)}%`,
                      width: `${String(100 / lanes)}%`,
                    }}
                  >
                    <ScheduleBlock
                      event={event}
                      isClashing={clashes.has(event.section.id)}
                      onSelect={onSelect}
                    />
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * The same schedule as a day-by-day list.
 *
 * An hour grid needs horizontal room the phone doesn't have, and this is a
 * phone-first audience — students check their schedule between classes. The
 * grid and the agenda render the same events; only one is visible at a time.
 */
export function ScheduleAgenda({ events, onSelect }: WeeklyGridProps) {
  const placed = timedEvents(events)
  const clashes = findClashes(placed)

  return (
    <div className="space-y-4">
      {visibleDays(placed).map((day) => {
        const forDay = placed
          .filter(({ section }) => sectionDays(section).includes(day.key))
          .sort(
            (a, b) =>
              (parseTimeRange(a.section.times)[0] ?? 0) -
              (parseTimeRange(b.section.times)[0] ?? 0)
          )

        if (forDay.length === 0) return null

        return (
          <section key={day.key} className="space-y-2">
            <h3 className="text-sm font-semibold">{day.label}</h3>
            {forDay.map((event) => {
              const isClashing = clashes.has(event.section.id)

              return (
                <button
                  key={event.section.id}
                  type="button"
                  onClick={() => {
                    onSelect(event)
                  }}
                  aria-label={blockLabel(event, isClashing)}
                  className={cn(
                    "flex w-full items-baseline gap-3 rounded-lg border p-3 text-left transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isClashing
                      ? "border-destructive bg-destructive/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {event.section.times}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {event.course.course_code} · {event.section.section_code}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {normalizeTitle(event.course.title)}
                      {formatRoom(event.section.room) &&
                        ` · ${formatRoom(event.section.room)}`}
                    </span>
                  </span>
                </button>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
