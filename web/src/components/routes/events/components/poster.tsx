import { useRef } from "react"
import type { CSSProperties, ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import type { Event, EventType, PosterHang } from "@/lib/events"
import { hangPoster } from "@/lib/events"
import { selectMedia } from "@/lib/media/functions"
import { CAMPUS_TIME_ZONE, cn, formatCampusTime } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { PAPER_GRAIN } from "./board-style"
import { useInViewOnce, usePrefersReducedMotion } from "./board-motion"

/** The ragged edge of a piece of tape. */
const TORN =
  "[clip-path:polygon(0_0,4%_12%,0_25%,4%_38%,0_50%,4%_62%,0_75%,4%_88%,0_100%,100%_100%,96%_88%,100%_75%,96%_62%,100%_50%,96%_38%,100%_25%,96%_12%,100%_0)]"

/* -------------------------------------------------------------------------- */
/*  What holds the paper to the board                                          */
/* -------------------------------------------------------------------------- */

function Mounting({
  hang,
  inView,
  delay,
}: {
  hang: PosterHang
  inView: boolean
  delay: number
}) {
  if (hang.mount === "pin") {
    return (
      <span
        aria-hidden
        className="absolute -top-2 z-10 -ml-2 size-4"
        style={{ left: `${hang.pinX}%` }}
      >
        <span
          className={cn(
            "block size-4 rounded-full transition-[opacity,scale,translate] duration-300 ease-out motion-reduce:transition-none",
            inView
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-4 scale-[2.4] opacity-0"
          )}
          style={{
            transitionDelay: `${delay + 320}ms`,
            backgroundColor: hang.pinColor,
            backgroundImage:
              "radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.8), transparent 45%)",
            boxShadow:
              "0 3px 3px rgb(0 0 0 / 0.45), inset -1px -2px 2px rgb(0 0 0 / 0.35)",
          }}
        />
      </span>
    )
  }

  const tape = cn(
    "absolute z-10 bg-amber-100/75 shadow-sm backdrop-blur-[1px] transition-opacity duration-500 motion-reduce:transition-none",
    TORN,
    inView ? "opacity-100" : "opacity-0"
  )
  const style = { transitionDelay: `${delay + 300}ms` }

  if (hang.mount === "tape") {
    return (
      <span
        aria-hidden
        className={cn(tape, "-top-3 -ml-10 h-6 w-20 -rotate-3")}
        style={{ ...style, left: `${hang.pinX}%` }}
      />
    )
  }

  return (
    <>
      <span
        aria-hidden
        className={cn(tape, "-top-1.5 -left-4 h-5 w-14 -rotate-45")}
        style={style}
      />
      <span
        aria-hidden
        className={cn(tape, "-top-1.5 -right-4 h-5 w-14 rotate-45")}
        style={style}
      />
    </>
  )
}

/**
 * A sheet of paper hung on the board the way `hang` says. It lands on the
 * board when it first scrolls into view; that is a transform and an opacity,
 * so it moves nothing around it.
 */
export function Pinned({
  hang,
  delay = 0,
  tone,
  paperStyle,
  children,
}: {
  hang: PosterHang
  delay?: number
  tone: string
  paperStyle?: CSSProperties
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = usePrefersReducedMotion()
  const inView = useInViewOnce(ref, reduce)

  return (
    <div
      ref={ref}
      style={{ marginLeft: hang.offsetX, marginTop: hang.offsetY }}
      className={cn(
        "relative transition-[opacity,translate,scale] duration-700 ease-[cubic-bezier(0.2,1.35,0.4,1)] hover:z-20 has-focus-visible:z-20 motion-reduce:transition-none",
        inView
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-6 scale-110 opacity-0"
      )}
    >
      <div
        style={{
          "--r": `${hang.rotation}deg`,
          "--k": hang.swing,
          transformOrigin: hang.mount === "pin" ? `${hang.pinX}% 0` : "50% 0",
        }}
        className={cn(
          "group relative",
          // The resting tilt plus the board's sway; straightened and lifted
          // on hover.
          "rotate-[calc(var(--r)+var(--sway,0deg)*var(--k))]",
          "transition-[rotate,translate,scale] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "hover:-translate-y-1.5 hover:scale-[1.04] hover:[--k:0] hover:[--r:0deg]",
          "motion-reduce:transition-none"
        )}
      >
        <Mounting hang={hang} inView={inView} delay={delay} />
        <div
          style={{ backgroundColor: tone, ...paperStyle }}
          className={cn(
            "relative flex flex-col overflow-hidden rounded-[2px] text-stone-900 transition-shadow duration-500 motion-reduce:transition-none",
            inView
              ? "shadow-[0_1px_1px_rgb(0_0_0/0.3),0_6px_10px_-3px_rgb(0_0_0/0.5)] group-hover:shadow-[0_2px_2px_rgb(0_0_0/0.25),0_18px_24px_-6px_rgb(0_0_0/0.55)]"
              : "shadow-[0_26px_26px_-8px_rgb(0_0_0/0.3)]"
          )}
        >
          {children}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-black/8"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
            style={{ backgroundImage: PAPER_GRAIN }}
          />
        </div>
      </div>
    </div>
  )
}

/** A sheet that has not been printed yet: stands in while a page loads. */
export function GhostSheet({ hang }: { hang: PosterHang }) {
  return (
    <Pinned hang={hang} tone="#fff3b8" paperStyle={{ aspectRatio: "1 / 2" }}>
      <div
        aria-hidden
        className="flex flex-1 animate-pulse flex-col gap-3 p-4 motion-reduce:animate-none"
      >
        <div className="flex-1 rounded-sm bg-black/[0.07]" />
        <div className="h-3 w-2/3 rounded bg-black/10" />
        <div className="h-3 w-1/2 rounded bg-black/10" />
      </div>
    </Pinned>
  )
}

/* -------------------------------------------------------------------------- */
/*  What is printed on the paper                                               */
/* -------------------------------------------------------------------------- */

/** An event happens on a date, but a recruitment closes on one. */
function relevantDate(event: Event) {
  return event.type === "recruitment"
    ? event.end_datetime
    : event.start_datetime
}

function dateLabel(event: Event) {
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(relevantDate(event)))

  const time = formatCampusTime(relevantDate(event))
  return event.type === "recruitment"
    ? `Apply by ${day}, ${time}`
    : `${day}, ${time}`
}

function dayAndMonth(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).formatToParts(new Date(iso))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return { day: value("day"), month: value("month") }
}

/** The first letters of the first two words of a name. */
function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/)
  return ((words[0]?.[0] ?? "N") + (words[1]?.[0] ?? "")).toUpperCase()
}

/** Paper and ink for each kind of event. */
const INKS: Record<EventType, { paper: string; ink: string }> = {
  academic: { paper: "#cfe3f7", ink: "#1f5a99" },
  professional: { paper: "#dbd6f3", ink: "#4b3da0" },
  recreational: { paper: "#fde0b8", ink: "#a85c0e" },
  cultural: { paper: "#f6d0d9", ink: "#a02f50" },
  sports: { paper: "#cdebd0", ink: "#226e38" },
  social: { paper: "#fff0a8", ink: "#8a6f08" },
  art: { paper: "#f4d3f0", ink: "#842f7d" },
  recruitment: { paper: "#cfeeea", ink: "#17706a" },
}

/** The three ways a drawn poster is decorated, picked by the event's id. */
const DECORATIONS = [
  // Slanted stripes
  (ink: string): CSSProperties => ({
    backgroundImage: `repeating-linear-gradient(135deg, transparent 0 14px, ${ink}1f 14px 22px)`,
  }),
  // Dots
  (ink: string): CSSProperties => ({
    backgroundImage: `radial-gradient(${ink}33 2px, transparent 2.5px)`,
    backgroundSize: "16px 16px",
  }),
  // A rising sun
  (ink: string): CSSProperties => ({
    backgroundImage: `radial-gradient(circle at 80% 100%, ${ink}2e 0 45%, transparent 45.5%), radial-gradient(circle at 80% 100%, ${ink}1a 0 70%, transparent 70.5%)`,
  }),
] as const

/**
 * A poster drawn for an event that has no image, or whose image would not
 * load: the date large, the kind of event, and its initials as a watermark.
 */
export function DrawnPoster({ event }: { event: Event }) {
  const { paper, ink } = INKS[event.type]
  const { day, month } = dayAndMonth(relevantDate(event))
  const decorate = DECORATIONS[event.id % DECORATIONS.length]

  return (
    <div
      aria-hidden
      style={{ backgroundColor: paper, color: ink, ...decorate(ink) }}
      className="@container relative flex size-full flex-col justify-between overflow-hidden p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="shrink-0 leading-none">
          <span className="block text-4xl font-bold tabular-nums @[11rem]:text-5xl">
            {day}
          </span>
          <span className="block text-[0.65rem] font-semibold tracking-[0.25em] uppercase">
            {month}
          </span>
        </p>
        <span
          style={{ borderColor: `${ink}66` }}
          className="min-w-0 truncate rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold tracking-wider uppercase"
        >
          {event.type === "recruitment" ? "apply by" : event.type}
        </span>
      </div>

      <span className="pointer-events-none absolute inset-x-0 bottom-12 text-center text-8xl leading-none font-bold tracking-tight opacity-15 select-none">
        {initials(event.name)}
      </span>

      <div className="space-y-1">
        <div style={{ backgroundColor: `${ink}55` }} className="h-px" />
        <p className="truncate text-xs font-medium">{event.place}</p>
      </div>
    </div>
  )
}

/** The flyer and its caption: what a visitor clicks to open the event. */
function PosterFace({ event }: { event: Event }) {
  const flyer = selectMedia(event.media, "carousel")

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2 pb-0">
        <div className="relative aspect-3/4 overflow-hidden bg-stone-200">
          {flyer ? (
            <ResilientImage
              src={flyer.url}
              alt={`Poster for ${event.name}`}
              containerClassName="absolute inset-0 size-full"
              fallback={<DrawnPoster event={event} />}
            />
          ) : (
            <div className="absolute inset-0">
              <DrawnPoster event={event} />
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3.5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-stone-700">
          <CalendarIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{dateLabel(event)}</span>
        </p>
        <h3 className="line-clamp-3 font-serif text-lg/snug font-bold text-balance">
          {event.name}
        </h3>
        <p className="flex items-center gap-1.5 text-xs text-stone-600">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{event.place}</span>
        </p>
      </div>
    </div>
  )
}

/** One event on the board, hung by its id. */
export function Poster({ event, delay }: { event: Event; delay: number }) {
  return (
    <Pinned hang={hangPoster(event.id)} delay={delay} tone="#fffdf8">
      <Link
        to="/events/$eventId"
        params={{ eventId: String(event.id) }}
        className="flex min-h-0 flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:ring-inset"
      >
        <PosterFace event={event} />
      </Link>
    </Pinned>
  )
}
