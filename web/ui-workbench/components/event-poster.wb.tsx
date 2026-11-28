import type { Event } from "@/lib/events"
import { eventPolicyLabel, getEventTiming } from "@/lib/events"
import { selectMedia } from "@/lib/media"
import { CAMPUS_TIME_ZONE, cn, formatCampusTime } from "@/lib/utils"
import { CardGrid } from "@/components/shared/page/card-grid"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { EVENTS, NOW } from "../route-screens/events.wb.demo"

const NOW_MS = new Date(NOW).getTime()

export const BOARD = "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"

export const PLATE: Record<Event["type"], string> = {
  academic: "bg-chart-1/16",
  professional: "bg-chart-2/16",
  recreational: "bg-chart-3/18",
  cultural: "bg-chart-4/18",
  sports: "bg-chart-5/18",
  social: "bg-chart-1/12",
  art: "bg-chart-4/12",
  recruitment: "bg-chart-2/12",
}

const TILT = ["-0.4deg", "0.25deg", "-0.2deg", "0.35deg"]

export function campusDayMonth(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(iso))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return { day: value("day"), month: value("month") }
}

export function mark(event: Event) {
  const words = event.name.replace(/[^\p{L} ]/gu, "").split(" ")
  return ((words[0]?.[0] ?? "N") + (words[1]?.[0] ?? "")).toUpperCase()
}

export function Plate({
  event,
  className,
}: {
  event: Event
  className?: string
}) {
  const poster = selectMedia(event.media, "carousel")
  const isRecruitment = event.type === "recruitment"
  const { day, month } = campusDayMonth(
    isRecruitment ? event.end_datetime : event.start_datetime
  )

  return (
    <div
      className={cn(
        "relative aspect-3/4 w-full overflow-hidden ring-1 ring-foreground/5 ring-inset",
        poster ? "bg-muted" : PLATE[event.type],
        className
      )}
    >
      {poster ? (
        <ResilientImage
          src={poster.url}
          alt={`Poster for ${event.name}`}
          containerClassName="size-full"
        />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-b from-transparent to-foreground/8"
          />
          <div className="relative flex size-full flex-col justify-between p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="leading-none">
                <span className="block font-heading text-5xl font-semibold tabular-nums">
                  {day}
                </span>
                <span className="block text-[0.6rem] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
                  {month}
                </span>
              </p>
              <span className="rounded-4xl bg-background/70 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider text-muted-foreground uppercase backdrop-blur-sm">
                {isRecruitment ? "apply by" : event.type}
              </span>
            </div>

            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-14 text-center font-heading text-8xl leading-none font-bold tracking-tight text-foreground/10 select-none"
            >
              {mark(event)}
            </span>

            <div className="space-y-1">
              <div aria-hidden className="h-px bg-foreground/15" />
              <p className="truncate text-xs font-medium">
                {formatCampusTime(event.start_datetime)} · {event.place}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function Tack({
  isPinned,
  onToggle,
}: {
  isPinned: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isPinned}
      aria-label={isPinned ? "Unpin from the board" : "Pin to the board"}
      title={isPinned ? "Unpin" : "Pin to the board"}
      className="absolute -top-3 left-1/2 z-20 grid size-8 -translate-x-1/2 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className={cn(
          "size-2.5 rounded-full ring-1",
          isPinned
            ? "bg-ring ring-ring/40"
            : "bg-foreground/20 ring-foreground/30"
        )}
      />
    </button>
  )
}

export function Poster({
  event,
  now = Date.now(),
  isPinned,
  isSelected,
  onOpen,
  onTogglePin,
}: {
  event: Event
  now?: number
  isPinned: boolean
  isSelected: boolean
  onOpen: () => void
  onTogglePin: () => void
}) {
  const timing = getEventTiming(
    event.start_datetime,
    event.end_datetime,
    now,
    event.type
  )

  return (
    <div className="group relative">
      <Tack isPinned={isPinned} onToggle={onTogglePin} />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${event.name}, ${timing.label} ${timing.detail}`}
        data-selected={isSelected || undefined}
        style={{ rotate: TILT[event.id % TILT.length] }}
        className="flex size-full w-full flex-col overflow-hidden rounded-lg bg-card text-left shadow-md ring-1 ring-foreground/10 transition-shadow hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-selected:ring-2 data-selected:ring-ring"
      >
        <Plate event={event} className="rounded-t-lg" />

        <div className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold text-balance">
            {event.name}
          </h3>
          <div className="mt-auto flex flex-nowrap items-center gap-1.5 overflow-hidden">
            <Badge
              variant={timing.kind === "ongoing" ? "default" : "outline"}
              className="truncate"
            >
              {timing.label} · {timing.detail}
            </Badge>
            {event.policy === "registration" && (
              <Badge variant="secondary" className="truncate">
                {eventPolicyLabel(event.policy)}
              </Badge>
            )}
          </div>
        </div>
      </button>
    </div>
  )
}

export function PosterSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10"
    >
      <Skeleton className="aspect-3/4 w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-5 w-2/5" />
      </div>
    </div>
  )
}

export default function EventPoster() {
  return (
    <div className="space-y-6 bg-background">
      <CardGrid columns={4} className={BOARD}>
        {EVENTS.slice(0, 4).map((event, index) => (
          <Poster
            key={event.id}
            event={event}
            now={NOW_MS}
            isPinned={index === 1}
            isSelected={index === 0}
            onOpen={() => {}}
            onTogglePin={() => {}}
          />
        ))}
      </CardGrid>

      <CardGrid columns={4} className={BOARD}>
        {Array.from({ length: 4 }, (_, index) => (
          <PosterSkeleton key={index} />
        ))}
      </CardGrid>
    </div>
  )
}
