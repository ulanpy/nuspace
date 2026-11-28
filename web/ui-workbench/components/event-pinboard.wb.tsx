import * as React from "react"
import {
  CalendarIcon,
  MapPinIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import type { Event } from "@/lib/events"
import { selectMedia } from "@/lib/media"
import { CAMPUS_TIME_ZONE, cn, formatCampusTime } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import {
  BOARD_CORK,
  BOARD_FRAME,
  BOARD_GRAIN,
  NOTE_LINED,
  PINBOARD_FILTERS,
  type PinboardFilter,
} from "./board-style"

/**
 * A cork board of event posters.
 *
 * Every event is a printed flyer, captioned with its date, name and place. How
 * a poster hangs — the tilt, the pin or the tape, the colour of the paper —
 * comes from its id, so it looks the same every time you come back to it.
 */

/* -------------------------------------------------------------------------- */
/*  How a poster hangs                                                         */
/* -------------------------------------------------------------------------- */

const PIN_COLORS = [
  "#e5484d",
  "#3b82f6",
  "#f5b800",
  "#2fa84f",
  "#f4f4f5",
  "#a855f7",
]
const PAPER_TONES = ["#fff3b8", "#d9eeff", "#ffdde3", "#dff5d6", "#ffe8cf"]
/** The ragged edge of a piece of tape. */
const TORN =
  "[clip-path:polygon(0_0,4%_12%,0_25%,4%_38%,0_50%,4%_62%,0_75%,4%_88%,0_100%,100%_100%,96%_88%,100%_75%,96%_62%,100%_50%,96%_38%,100%_25%,96%_12%,100%_0)]"

type Mount = "pin" | "tape" | "corners"

type Look = {
  /** The resting tilt, in degrees. */
  rot: number
  /** How strongly it swings when the page scrolls. */
  swing: number
  mount: Mount
  pin: string
  /** Where along the top edge the pin or the tape sits, as a percentage. */
  pinX: number
  paper: string
  dx: number
  dy: number
}

/** A stable number for a string, so a poster looks the same every visit. */
function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

/** A seeded generator, so the same seed gives the same numbers. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeLook(id: string): Look {
  const random = rng(hash(id))
  const roll = random()
  const mount: Mount = roll < 0.55 ? "pin" : roll < 0.78 ? "tape" : "corners"
  const flatten = mount === "corners" ? 0.35 : 1
  const sign = random() > 0.5 ? 1 : -1

  return {
    rot: (random() - 0.5) * 7 * flatten,
    swing:
      sign *
      (0.6 + random() * 0.6) *
      (mount === "pin" ? 1 : mount === "tape" ? 0.5 : 0.2),
    mount,
    pin: PIN_COLORS[Math.floor(random() * PIN_COLORS.length)],
    pinX: 36 + random() * 28,
    paper: PAPER_TONES[Math.floor(random() * PAPER_TONES.length)],
    dx: (random() - 0.5) * 14,
    dy: random() * 12,
  }
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      query.addEventListener("change", notify)
      return () => query.removeEventListener("change", notify)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
}

/** Two columns on a phone, three on a tablet, four on a wide screen. */
function useColumnCount() {
  return React.useSyncExternalStore(
    (notify) => {
      const queries = [
        window.matchMedia("(min-width: 768px)"),
        window.matchMedia("(min-width: 1280px)"),
      ]
      queries.forEach((query) => query.addEventListener("change", notify))
      return () =>
        queries.forEach((query) => query.removeEventListener("change", notify))
    },
    () =>
      window.matchMedia("(min-width: 1280px)").matches
        ? 4
        : window.matchMedia("(min-width: 768px)").matches
          ? 3
          : 2,
    () => 2
  )
}

/** True once the element has scrolled into view, and it stays true. */
function useInViewOnce(ref: React.RefObject<Element | null>, skip: boolean) {
  const [seen, setSeen] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element || seen || skip) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [ref, seen, skip])

  return seen || skip
}

/** Scrolling the page jostles the board, and the papers settle again. */
function useBoardSway(
  ref: React.RefObject<HTMLElement | null>,
  disabled: boolean
) {
  React.useEffect(() => {
    const element = ref.current
    if (!element || disabled) return undefined
    let last = window.scrollY
    let timer = 0

    const onScroll = () => {
      const dy = window.scrollY - last
      last = window.scrollY
      element.style.setProperty(
        "--sway",
        `${Math.max(-3.5, Math.min(3.5, dy * 0.09))}deg`
      )
      window.clearTimeout(timer)
      timer = window.setTimeout(
        () => element.style.setProperty("--sway", "0deg"),
        80
      )
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
  }, [ref, disabled])
}

/* -------------------------------------------------------------------------- */
/*  The paper and what holds it to the board                                    */
/* -------------------------------------------------------------------------- */

function Mounting({
  look,
  inView,
  delay,
}: {
  look: Look
  inView: boolean
  delay: number
}) {
  if (look.mount === "pin") {
    return (
      <span
        aria-hidden
        className="absolute -top-2 z-10 -ml-2 size-4"
        style={{ left: `${look.pinX}%` }}
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
            backgroundColor: look.pin,
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

  if (look.mount === "tape") {
    return (
      <span
        aria-hidden
        className={cn(tape, "-top-3 -ml-10 h-6 w-20 -rotate-3")}
        style={{ ...style, left: `${look.pinX}%` }}
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

function Pinned({
  look,
  delay,
  tone,
  paperStyle,
  children,
}: {
  look: Look
  delay: number
  tone: string
  paperStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduce = usePrefersReducedMotion()
  const inView = useInViewOnce(ref, reduce)

  return (
    <div
      ref={ref}
      style={{ marginLeft: look.dx, marginTop: look.dy }}
      className={cn(
        // The sheet is slapped onto the board.
        "relative transition-[opacity,translate,scale] duration-700 ease-[cubic-bezier(0.2,1.35,0.4,1)] hover:z-20 has-[:focus-visible]:z-20 motion-reduce:transition-none",
        inView
          ? "translate-y-0 scale-100 opacity-100"
          : "-translate-y-6 scale-110 opacity-0"
      )}
    >
      <div
        style={
          {
            "--r": `${look.rot}deg`,
            "--k": look.swing,
            transformOrigin: look.mount === "pin" ? `${look.pinX}% 0` : "50% 0",
          } as React.CSSProperties
        }
        className={cn(
          "group relative",
          // The resting tilt, plus the sway of the scroll; straightened and
          // lifted on hover.
          "[rotate:calc(var(--r)_+_var(--sway,0deg)_*_var(--k))]",
          "transition-[rotate,translate,scale] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          "hover:-translate-y-1.5 hover:scale-[1.04] hover:[--k:0] hover:[--r:0deg]",
          "motion-reduce:transition-none"
        )}
      >
        <Mounting look={look} inView={inView} delay={delay} />
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
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-black/[0.08]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
            style={{ backgroundImage: BOARD_GRAIN }}
          />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  What is written on the paper                                               */
/* -------------------------------------------------------------------------- */

function dateLabel(event: Event) {
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(event.start_datetime))

  return `${day}, ${formatCampusTime(event.start_datetime)}`
}

function PosterBody({ event }: { event: Event }) {
  const flyer = selectMedia(event.media, "carousel")

  return (
    <div className="flex flex-1 flex-col">
      <div className="p-2 pb-0">
        <div className="relative aspect-[3/4] overflow-hidden bg-stone-200">
          <ResilientImage
            src={flyer?.url}
            alt={`Poster for ${event.name}`}
            containerClassName="absolute inset-0 size-full"
          />
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
        <h3 className="line-clamp-3 font-serif text-lg leading-snug font-bold text-balance">
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

function GhostBody() {
  return (
    <div aria-hidden className="flex flex-1 animate-pulse flex-col gap-3 p-4">
      <div className="flex-1 rounded-sm bg-black/[0.07]" />
      <div className="h-3 w-2/3 rounded bg-black/10" />
      <div className="h-3 w-1/2 rounded bg-black/10" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  The notes on the board                                                     */
/* -------------------------------------------------------------------------- */

function Note({ look, children }: { look: Look; children: React.ReactNode }) {
  return (
    <Pinned
      look={{ ...look, dx: 0, dy: 0, mount: "pin" }}
      delay={0}
      tone="#fffbe6"
    >
      <div className="flex flex-col gap-2 p-4 text-center font-serif">
        {children}
      </div>
    </Pinned>
  )
}

const HEADING_LOOK: Look = {
  rot: -1,
  swing: 0.5,
  mount: "pin",
  pin: "#e5484d",
  pinX: 50,
  paper: "#fffbe6",
  dx: 0,
  dy: 0,
}

function HeadingNote({
  title,
  subtitle,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  onCreate,
}: {
  title: string
  subtitle?: string
  filter?: PinboardFilter
  onFilterChange?: (filter: PinboardFilter) => void
  query?: string
  onQueryChange?: (query: string) => void
  onCreate?: () => void
}) {
  return (
    <div className="mx-auto mb-10 max-w-xl sm:mb-14">
      <Pinned
        look={HEADING_LOOK}
        delay={0}
        tone="#fffbe6"
        paperStyle={NOTE_LINED}
      >
        <div className="py-5 pr-5 pl-10 sm:py-6 sm:pl-12">
          <h2 className="font-serif text-3xl leading-tight font-bold text-balance sm:text-4xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          ) : null}

          {filter && onFilterChange ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <fieldset className="-ml-2.5 flex flex-wrap gap-x-1 gap-y-1.5 border-0 p-0">
                <legend className="sr-only">Filter events by date</legend>
                {PINBOARD_FILTERS.map((option) => {
                  const active = option.value === filter
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        onFilterChange(option.value)
                      }}
                      className={cn(
                        "relative isolate rounded-[3px] px-2.5 py-1 text-sm font-medium transition-colors outline-none",
                        "focus-visible:ring-2 focus-visible:ring-stone-900/60",
                        active
                          ? "text-stone-950"
                          : "text-stone-600 hover:bg-black/[0.06] hover:text-stone-950"
                      )}
                    >
                      {/* The highlighter sweeps in from the left. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0 -z-10 origin-left -rotate-1 rounded-[3px] bg-amber-300/80 mix-blend-multiply transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none",
                          active ? "scale-x-100" : "scale-x-0"
                        )}
                      />
                      {option.label}
                    </button>
                  )
                })}
              </fieldset>

              {onCreate ? (
                <button
                  type="button"
                  onClick={onCreate}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-[3px] border border-dashed border-stone-500/60 px-2.5 py-1 text-sm font-medium text-stone-700 transition-colors hover:bg-black/[0.05] hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:outline-none"
                >
                  <PlusIcon className="size-3.5" aria-hidden />
                  Create event
                </button>
              ) : null}
            </div>
          ) : null}

          {onQueryChange ? (
            <div className="mt-3 flex items-center gap-2 border-b-2 border-dashed border-stone-400/70 focus-within:border-stone-700">
              <SearchIcon
                className="size-4 shrink-0 text-stone-500"
                aria-hidden
              />
              <input
                type="search"
                value={query ?? ""}
                onChange={(event) => {
                  onQueryChange(event.target.value)
                }}
                placeholder="Search the board"
                aria-label="Search events"
                className="w-full appearance-none bg-transparent py-1.5 font-serif text-base text-stone-900 outline-none placeholder:text-stone-500/70 [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    onQueryChange("")
                  }}
                  className="shrink-0 rounded-full p-1 text-stone-500 hover:bg-black/[0.06] hover:text-stone-900 focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:outline-none"
                >
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Pinned>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  The board                                                                  */
/* -------------------------------------------------------------------------- */

type Slot = {
  key: string
  event?: Event
  look: Look
  /** How tall the poster is, in units of its width, for placing it. */
  height: number
}

export function EventPinboard({
  events,
  title = "What’s on",
  subtitle,
  filter,
  onFilterChange,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  onOpen,
  query,
  onQueryChange,
  onCreate,
  className,
}: {
  events: Event[]
  title?: string
  subtitle?: string
  filter?: PinboardFilter
  onFilterChange?: (filter: PinboardFilter) => void
  query?: string
  onQueryChange?: (query: string) => void
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
  onOpen?: (event: Event) => void
  onCreate?: () => void
  className?: string
}) {
  const reduce = usePrefersReducedMotion()
  const columnCount = useColumnCount()
  const boardRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  useBoardSway(boardRef, reduce)

  const loadMoreRef = React.useRef(onLoadMore)
  React.useEffect(() => {
    loadMoreRef.current = onLoadMore
  })

  // The observer is rebuilt after every page, so a board that is still short
  // after a page arrives keeps loading until the viewport is full.
  React.useEffect(() => {
    const element = sentinelRef.current
    if (!element || !hasNextPage || isFetchingNextPage || isLoading) {
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current?.()
      },
      { rootMargin: "0px 0px 800px 0px" }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, isLoading, events.length])

  // Each poster goes into the shortest column. The heights are known up
  // front, so nothing moves when an image arrives, and a new page never
  // shifts the posters already on the board.
  const columns = React.useMemo(() => {
    const slots: Slot[] = events.map((event) => {
      const look = makeLook(String(event.id))
      return {
        key: String(event.id),
        event,
        look,
        height: 4 / 3 + 0.75,
      }
    })

    const ghosts = isLoading ? 8 : isFetchingNextPage ? columnCount : 0
    for (let index = 0; index < ghosts; index++) {
      const look = makeLook(`ghost-${events.length}-${index}`)
      slots.push({
        key: `ghost-${index}`,
        look,
        height: 4 / 3 + 0.4,
      })
    }

    const buckets = Array.from({ length: columnCount }, () => ({
      items: [] as Slot[],
      height: 0,
    }))
    for (const slot of slots) {
      const shortest = buckets.reduce((a, b) =>
        b.height < a.height - 1e-6 ? b : a
      )
      shortest.items.push(slot)
      shortest.height += slot.height
    }
    return buckets
  }, [events, columnCount, isLoading, isFetchingNextPage])

  const empty = !isLoading && events.length === 0
  const finished =
    !isLoading && !hasNextPage && !isFetchingNextPage && events.length > 0

  return (
    <section
      aria-label="Events"
      style={BOARD_FRAME}
      className={cn(
        // `isolate` keeps the lifted poster's z-index inside the board, so it
        // can never paint over the sticky header.
        "relative isolate rounded-2xl p-2.5 shadow-2xl ring-1 shadow-black/40 ring-black/50 sm:p-4",
        className
      )}
    >
      <div className="relative overflow-hidden rounded-lg">
        <div
          aria-hidden
          className="absolute inset-0 dark:brightness-[0.65]"
          style={BOARD_CORK}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_12px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(0_0_0/0.3)]"
        />

        <div
          ref={boardRef}
          aria-busy={isLoading || isFetchingNextPage}
          className="relative min-h-[70vh] px-4 py-8 sm:px-8 sm:py-10"
        >
          <HeadingNote
            title={title}
            subtitle={subtitle}
            filter={filter}
            onFilterChange={onFilterChange}
            query={query}
            onQueryChange={onQueryChange}
            onCreate={onCreate}
          />

          {/* Keyed by the filter: switching it clears the board and every
              poster is pinned up again. */}
          <div key={filter ?? "all"}>
            {empty ? (
              <div className="mx-auto w-56 pt-10">
                <Note look={makeLook("empty")}>
                  {query ? (
                    <>
                      <h3 className="text-xl leading-tight font-bold text-balance">
                        Nothing matches “{query}”
                      </h3>
                      <p className="font-sans text-sm text-stone-600">
                        Try another word.
                      </p>
                    </>
                  ) : filter && filter !== "upcoming" ? (
                    <>
                      <h3 className="text-xl leading-tight font-bold">
                        Nothing{" "}
                        {PINBOARD_FILTERS.find(
                          (option) => option.value === filter
                        )?.label.toLowerCase()}
                      </h3>
                      <p className="font-sans text-sm text-stone-600">
                        Try a wider range.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl leading-tight font-bold">
                        Nothing pinned yet
                      </h3>
                      <p className="font-sans text-sm text-stone-600">
                        New events will show up here.
                      </p>
                    </>
                  )}
                </Note>
              </div>
            ) : (
              <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
                {columns.map((column, columnIndex) => (
                  <ul
                    key={columnIndex}
                    className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-8"
                  >
                    {column.items.map((slot, row) => {
                      const delay = columnIndex * 80 + (row % 3) * 40
                      return (
                        <li key={slot.key}>
                          {slot.event ? (
                            <Pinned
                              look={slot.look}
                              delay={delay}
                              tone="#fffdf8"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onOpen?.(slot.event!)
                                }}
                                className="flex min-h-0 flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-900/60 focus-visible:ring-inset"
                              >
                                <PosterBody event={slot.event} />
                              </button>
                            </Pinned>
                          ) : (
                            <Pinned
                              look={slot.look}
                              delay={delay}
                              tone={slot.look.paper}
                              paperStyle={{ aspectRatio: "3 / 4" }}
                            >
                              <GhostBody />
                            </Pinned>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ))}
              </div>
            )}
          </div>

          <div ref={sentinelRef} aria-hidden className="h-px" />

          {finished ? (
            <div className="mx-auto mt-12 w-52">
              <Note look={makeLook("end")}>
                <p className="text-base leading-snug font-bold text-balance">
                  That&rsquo;s everything on the board
                </p>
              </Note>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default function EventPinboardPreview() {
  return (
    <div className="min-h-full bg-background p-6">
      <EventPinboard events={[]} title="Events" isLoading />
    </div>
  )
}
