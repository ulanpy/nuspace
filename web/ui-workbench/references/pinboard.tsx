import * as React from "react"
import { CalendarDays, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type PinboardEvent = {
  id: string | number
  title: string
  /** Pre-formatted, e.g. "Sat, Oct 24, 7 pm". Format it yourself to avoid SSR/timezone mismatches. */
  dateLabel?: string
  location?: string
  imageUrl?: string | null
  href?: string
}

export type PinboardFilter = "upcoming" | "today" | "week" | "month"

export const PINBOARD_FILTERS: { value: PinboardFilter; label: string }[] = [
  { value: "upcoming", label: "All upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
]

/**
 * Date range for a filter, in the viewer's local time, as [from, to). `to` is null for "upcoming".
 * Week runs Monday to Sunday. Ranges start at the beginning of today so events already
 * under way are included. Send these to your API as query params.
 */
export function getFilterRange(filter: PinboardFilter, now = new Date()): { from: Date; to: Date | null } {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (filter) {
    case "today":
      return { from: today, to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1) }
    case "week": {
      const sinceMonday = (today.getDay() + 6) % 7
      return { from: today, to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + (7 - sinceMonday)) }
    }
    case "month":
      return { from: today, to: new Date(today.getFullYear(), today.getMonth() + 1, 1) }
    default:
      return { from: now, to: null }
  }
}

export type PinboardProps = {
  events: PinboardEvent[]
  /** Heading on the pinned note at the top of the board. */
  title?: string
  /** Small line under the heading, e.g. "24 events". */
  subtitle?: string
  /** Selected filter. The filter tags show only when both `filter` and `onFilterChange` are set. */
  filter?: PinboardFilter
  onFilterChange?: (filter: PinboardFilter) => void
  /** First load: shows blank sheets while the initial page is fetched. */
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  /** Called when the bottom of the board nears the viewport. */
  onLoadMore?: () => void
  /** Wrap the poster in your router link. Defaults to a plain <a href>. */
  renderLink?: (event: PinboardEvent, children: React.ReactNode) => React.ReactNode
  /** Shown under the empty-state note, e.g. a "Create event" button. */
  emptyAction?: React.ReactNode
  className?: string
}

/** Use on your own link so focus rings and layout match the poster. */
export const posterLinkClass =
  "flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"

/* -------------------------------------------------------------------------- */
/*  Textures (generated, no assets needed)                                     */
/* -------------------------------------------------------------------------- */

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const noise = (freq: number, octaves: number, seed: number, matrix: string, size: number) =>
  svgUrl(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'>` +
      `<filter id='f' x='0' y='0' width='100%' height='100%'>` +
      `<feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/>` +
      `<feColorMatrix values='${matrix}'/></filter>` +
      `<rect width='100%' height='100%' filter='url(#f)'/></svg>`,
  )

const CORK: React.CSSProperties = {
  backgroundColor: "#c4935d",
  backgroundImage: [
    "radial-gradient(120% 70% at 50% 0%, rgb(255 238 205 / 0.28), transparent 60%)",
    noise(0.035, 2, 4, "0 0 0 0 .42  0 0 0 0 .24  0 0 0 0 .08  0 0 0 .9 -.28", 600),
    noise(0.55, 3, 7, "0 0 0 0 .36  0 0 0 0 .2  0 0 0 0 .07  0 0 0 1.7 -.6", 240),
    noise(0.9, 2, 11, "0 0 0 0 .95  0 0 0 0 .74  0 0 0 0 .46  0 0 0 1.5 -.7", 180),
  ].join(", "),
  backgroundSize: "100% 100%, 600px 600px, 240px 240px, 180px 180px",
}

const FRAME: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 2px, transparent 2px 9px), linear-gradient(135deg, #94603a, #5a3720 70%)",
}

const GRAIN = noise(0.8, 2, 2, "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 0", 160)

/* -------------------------------------------------------------------------- */
/*  Deterministic "look" per poster (same id = same tilt, pin, paper)          */
/* -------------------------------------------------------------------------- */

const PIN_COLORS = ["#e5484d", "#3b82f6", "#f5b800", "#2fa84f", "#f4f4f5", "#a855f7"]
const PAPER_TONES = ["#fff3b8", "#d9eeff", "#ffdde3", "#dff5d6", "#ffe8cf"]
const RATIOS = [1.25, 1.33, 1, 1.5] // height / width
const TORN =
  "[clip-path:polygon(0_0,4%_12%,0_25%,4%_38%,0_50%,4%_62%,0_75%,4%_88%,0_100%,100%_100%,96%_88%,100%_75%,96%_62%,100%_50%,96%_38%,100%_25%,96%_12%,100%_0)]"

type Mount = "pin" | "tape" | "corners"
type Look = {
  rot: number
  k: number // how strongly it swings when the page scrolls
  ratio: number
  mount: Mount
  pin: string
  pinX: number
  paper: string
  dx: number
  dy: number
}

function hash(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeLook(id: string): Look {
  const r = rng(hash(id))
  const roll = r()
  const mount: Mount = roll < 0.55 ? "pin" : roll < 0.78 ? "tape" : "corners"
  const flatten = mount === "corners" ? 0.35 : 1
  const sign = r() > 0.5 ? 1 : -1
  return {
    rot: (r() - 0.5) * 7 * flatten,
    k: sign * (0.6 + r() * 0.6) * (mount === "pin" ? 1 : mount === "tape" ? 0.5 : 0.2),
    ratio: RATIOS[Math.floor(r() * RATIOS.length)],
    mount,
    pin: PIN_COLORS[Math.floor(r() * PIN_COLORS.length)],
    pinX: 36 + r() * 28,
    paper: PAPER_TONES[Math.floor(r() * PAPER_TONES.length)],
    dx: (r() - 0.5) * 14,
    dy: r() * 12,
  }
}

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
      mq.addEventListener("change", cb)
      return () => mq.removeEventListener("change", cb)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )
}

function useColumnCount() {
  return React.useSyncExternalStore(
    (cb) => {
      const queries = [window.matchMedia("(min-width: 768px)"), window.matchMedia("(min-width: 1280px)")]
      queries.forEach((q) => q.addEventListener("change", cb))
      return () => queries.forEach((q) => q.removeEventListener("change", cb))
    },
    () => (window.matchMedia("(min-width: 1280px)").matches ? 4 : window.matchMedia("(min-width: 768px)").matches ? 3 : 2),
    () => 2,
  )
}

/** True once the element has scrolled into view (and stays true). */
function useInViewOnce(ref: React.RefObject<Element | null>, skip: boolean) {
  const [seen, setSeen] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el || seen || skip) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, seen, skip])
  return seen || skip
}

/** Page scroll jostles the board: sets --sway (deg) from scroll velocity, then settles to 0. */
function useBoardSway(ref: React.RefObject<HTMLElement | null>, disabled: boolean) {
  React.useEffect(() => {
    const el = ref.current
    if (!el || disabled) return
    let last = window.scrollY
    let timer = 0
    const onScroll = () => {
      const dy = window.scrollY - last
      last = window.scrollY
      el.style.setProperty("--sway", `${Math.max(-3.5, Math.min(3.5, dy * 0.09))}deg`)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => el.style.setProperty("--sway", "0deg"), 80)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
  }, [ref, disabled])
}

/* -------------------------------------------------------------------------- */
/*  Pinned: handles mount hardware, entrance, tilt, sway, hover               */
/* -------------------------------------------------------------------------- */

function Mounting({ look, inView, delay }: { look: Look; inView: boolean; delay: number }) {
  if (look.mount === "pin") {
    return (
      <span aria-hidden className="absolute -top-2 z-10 -ml-2 size-4" style={{ left: `${look.pinX}%` }}>
        <span
          className={cn(
            "block size-4 rounded-full transition-[opacity,scale,translate] duration-300 ease-out motion-reduce:transition-none",
            inView ? "translate-y-0 scale-100 opacity-100" : "-translate-y-4 scale-[2.4] opacity-0",
          )}
          style={{
            transitionDelay: `${delay + 320}ms`,
            backgroundColor: look.pin,
            backgroundImage: "radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.8), transparent 45%)",
            boxShadow: "0 3px 3px rgb(0 0 0 / 0.45), inset -1px -2px 2px rgb(0 0 0 / 0.35)",
          }}
        />
      </span>
    )
  }

  const tape = cn(
    "absolute z-10 bg-amber-100/75 shadow-sm backdrop-blur-[1px] transition-opacity duration-500 motion-reduce:transition-none",
    TORN,
    inView ? "opacity-100" : "opacity-0",
  )
  const tapeStyle = { transitionDelay: `${delay + 300}ms` }

  if (look.mount === "tape") {
    return <span aria-hidden className={cn(tape, "-top-3 -ml-10 h-6 w-20 -rotate-3")} style={{ ...tapeStyle, left: `${look.pinX}%` }} />
  }

  return (
    <>
      <span aria-hidden className={cn(tape, "-top-1.5 -left-4 h-5 w-14 -rotate-45")} style={tapeStyle} />
      <span aria-hidden className={cn(tape, "-top-1.5 -right-4 h-5 w-14 rotate-45")} style={tapeStyle} />
    </>
  )
}

function Pinned({
  look,
  delay,
  tone,
  paperStyle,
  interactive = true,
  children,
}: {
  look: Look
  delay: number
  tone: string
  paperStyle?: React.CSSProperties
  /** Lift and straighten on hover. Turn off for notes that contain controls. */
  interactive?: boolean
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const reduce = usePrefersReducedMotion()
  const inView = useInViewOnce(ref, reduce)

  return (
    <div
      ref={ref}
      style={{ marginLeft: look.dx, marginTop: look.dy, transitionDelay: `${delay}ms` }}
      className={cn(
        // entrance: the sheet is slapped onto the board
        "relative transition-[opacity,translate,scale] duration-700 ease-[cubic-bezier(0.2,1.35,0.4,1)] hover:z-20 has-[:focus-visible]:z-20 motion-reduce:transition-none",
        inView ? "translate-y-0 scale-100 opacity-100" : "-translate-y-6 scale-110 opacity-0",
      )}
    >
      <div
        style={
          {
            "--r0": `${look.rot}deg`,
            "--k0": look.k,
            transformOrigin: look.mount === "pin" ? `${look.pinX}% 0` : "50% 0",
          } as React.CSSProperties
        }
        className={cn(
          "group relative",
          // resting tilt + scroll sway; straightens and lifts on hover
          "[--r:var(--r0)] [--k:var(--k0)] [rotate:calc(var(--r)_+_var(--sway,0deg)_*_var(--k))]",
          "transition-[rotate,translate,scale] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          interactive && "hover:-translate-y-1.5 hover:scale-[1.04] hover:[--k:0] hover:[--r:0deg]",
          "motion-reduce:transition-none",
        )}
      >
        <Mounting look={look} inView={inView} delay={delay} />
        <div
          style={{ backgroundColor: tone, ...paperStyle }}
          className={cn(
            "relative flex flex-col overflow-hidden rounded-[2px] text-stone-900 transition-shadow duration-500 motion-reduce:transition-none",
            inView
              ? cn(
                  "shadow-[0_1px_1px_rgb(0_0_0/0.3),0_6px_10px_-3px_rgb(0_0_0/0.5)]",
                  interactive && "group-hover:shadow-[0_2px_2px_rgb(0_0_0/0.25),0_18px_24px_-6px_rgb(0_0_0/0.55)]",
                )
              : "shadow-[0_26px_26px_-8px_rgb(0_0_0/0.3)]",
          )}
        >
          {children}
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-black/[0.08]" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply"
            style={{ backgroundImage: GRAIN }}
          />
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Poster contents                                                            */
/* -------------------------------------------------------------------------- */

function PosterImage({ src }: { src: string }) {
  const [loaded, setLoaded] = React.useState(false)
  return (
    <img
      ref={(el) => {
        if (el?.complete && el.naturalWidth > 0) setLoaded(true)
      }}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onLoad={() => setLoaded(true)}
      className={cn("absolute inset-0 size-full object-cover transition-opacity duration-700", loaded ? "opacity-100" : "opacity-0")}
    />
  )
}

function Meta({ event, className }: { event: PinboardEvent; className?: string }) {
  return (
    <>
      {event.dateLabel ? (
        <p className={cn("flex items-center gap-1.5 text-xs font-medium text-stone-700", className)}>
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="truncate">{event.dateLabel}</span>
        </p>
      ) : null}
    </>
  )
}

function PosterBody({ event, look }: { event: PinboardEvent; look: Look }) {
  if (event.imageUrl) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="p-2 pb-0">
          <div className="relative overflow-hidden bg-stone-200" style={{ aspectRatio: `1 / ${look.ratio}` }}>
            <PosterImage src={event.imageUrl} />
            <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)]" />
          </div>
        </div>
        <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3.5">
          <Meta event={event} />
          <h3 className="line-clamp-3 font-serif text-lg leading-snug font-bold text-balance">{event.title}</h3>
          {event.location ? (
            <p className="flex items-center gap-1.5 text-xs text-stone-600">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="m-2 flex flex-1 flex-col gap-3 border-2 border-dashed border-black/20 p-3">
      <Meta event={event} />
      <h3 className="my-auto line-clamp-6 font-serif text-2xl leading-[1.1] font-bold text-balance">{event.title}</h3>
      {event.location ? (
        <p className="flex items-center gap-1.5 border-t border-dashed border-black/20 pt-2 text-xs text-stone-700">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      ) : null}
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

function Note({ look, children }: { look: Look; children: React.ReactNode }) {
  return (
    <Pinned look={{ ...look, dx: 0, dy: 0, mount: "pin" }} delay={0} tone="#fffbe6" interactive={false}>
      <div className="flex flex-col gap-2 p-4 text-center font-serif">{children}</div>
    </Pinned>
  )
}

/* -------------------------------------------------------------------------- */
/*  Heading note with filter tags                                              */
/* -------------------------------------------------------------------------- */

const HEADING_LOOK: Look = {
  rot: -1,
  k: 0.5,
  ratio: 1,
  mount: "pin",
  pin: "#e5484d",
  pinX: 50,
  paper: "#fffbe6",
  dx: 0,
  dy: 0,
}

// Notebook paper: a red margin line and faint blue rules.
const LINED: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, transparent 2rem, rgb(220 38 38 / 0.35) 2rem calc(2rem + 1px), transparent calc(2rem + 1px)), repeating-linear-gradient(to bottom, transparent 0 1.75rem, rgb(59 130 246 / 0.18) 1.75rem calc(1.75rem + 1px))",
}

function HeadingNote({
  title,
  subtitle,
  filter,
  onFilterChange,
}: {
  title: string
  subtitle?: string
  filter?: PinboardFilter
  onFilterChange?: (filter: PinboardFilter) => void
}) {
  return (
    <div className="mx-auto mb-10 max-w-xl sm:mb-14">
      <Pinned look={HEADING_LOOK} delay={0} tone="#fffbe6" paperStyle={LINED} interactive={false}>
        <div className="py-5 pr-5 pl-10 sm:py-6 sm:pl-12">
          <h2 className="font-serif text-3xl leading-tight font-bold text-balance sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-stone-600">{subtitle}</p> : null}

          {filter && onFilterChange ? (
            <div role="group" aria-label="Filter events by date" className="mt-4 -ml-2.5 flex flex-wrap gap-x-1 gap-y-1.5">
              {PINBOARD_FILTERS.map((f) => {
                const active = f.value === filter
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onFilterChange(f.value)}
                    className={cn(
                      "relative isolate rounded-[3px] px-2.5 py-1 text-sm font-medium outline-none transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-stone-900/60",
                      active ? "text-stone-950" : "text-stone-600 hover:bg-black/[0.06] hover:text-stone-950",
                    )}
                  >
                    {/* highlighter stroke that sweeps in from the left */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-0 -z-10 origin-left -rotate-1 rounded-[3px] bg-amber-300/80 mix-blend-multiply transition-transform duration-300 ease-[cubic-bezier(0.3,1.3,0.5,1)] motion-reduce:transition-none",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                    {f.label}
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>
      </Pinned>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Board                                                                      */
/* -------------------------------------------------------------------------- */

type Slot = { key: string; event?: PinboardEvent; look: Look; est: number }

export function Pinboard({
  events,
  title = "What’s on",
  subtitle,
  filter,
  onFilterChange,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  renderLink,
  emptyAction,
  className,
}: PinboardProps) {
  const reduce = usePrefersReducedMotion()
  const columnCount = useColumnCount()
  const boardRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  useBoardSway(boardRef, reduce)

  const loadMoreRef = React.useRef(onLoadMore)
  React.useEffect(() => {
    loadMoreRef.current = onLoadMore
  })

  // Infinite scroll. The observer is rebuilt after every fetch, so a board that is
  // still short after a page arrives keeps loading until the viewport is filled.
  React.useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage || isFetchingNextPage || isLoading) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current?.()
      },
      { rootMargin: "0px 0px 800px 0px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, isLoading, events.length])

  // Place each poster in the currently shortest column. Heights are known up front
  // (fixed aspect ratios), so nothing jumps when images load, and appending a page
  // never moves posters that are already on the board.
  const columns = React.useMemo(() => {
    const slots: Slot[] = events.map((event) => {
      const look = makeLook(String(event.id))
      return { key: String(event.id), event, look, est: look.ratio + (event.imageUrl ? 0.6 : 0.05) + 0.15 }
    })
    const ghostCount = isLoading ? 8 : isFetchingNextPage ? columnCount : 0
    for (let i = 0; i < ghostCount; i++) {
      const look = makeLook(`ghost-${events.length}-${i}`)
      slots.push({ key: `ghost-${i}`, look, est: look.ratio + 0.4 })
    }
    const cols = Array.from({ length: columnCount }, () => ({ items: [] as Slot[], height: 0 }))
    for (const slot of slots) {
      const col = cols.reduce((a, b) => (b.height < a.height - 1e-6 ? b : a))
      col.items.push(slot)
      col.height += slot.est
    }
    return cols
  }, [events, columnCount, isLoading, isFetchingNextPage])

  const link =
    renderLink ??
    ((event: PinboardEvent, children: React.ReactNode) =>
      event.href ? (
        <a href={event.href} draggable={false} className={posterLinkClass}>
          {children}
        </a>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      ))

  const empty = !isLoading && events.length === 0
  const finished = !isLoading && !hasNextPage && !isFetchingNextPage && events.length > 0

  return (
    <section
      aria-label="Events"
      style={FRAME}
      className={cn("relative rounded-2xl p-2.5 shadow-2xl ring-1 shadow-black/40 ring-black/50 sm:p-4", className)}
    >
      <div className="relative overflow-hidden rounded-lg">
        <div aria-hidden className="absolute inset-0 dark:brightness-[0.65]" style={CORK} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 shadow-[inset_0_3px_12px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(0_0_0/0.3)]"
        />

        <div ref={boardRef} aria-busy={isLoading || isFetchingNextPage} className="relative min-h-[70vh] px-4 py-8 sm:px-8 sm:py-10">
          <HeadingNote title={title} subtitle={subtitle} filter={filter} onFilterChange={onFilterChange} />

          {/* keyed by filter: switching filters clears the board and every poster is pinned up again */}
          <div key={filter ?? "all"}>
          {empty ? (
            <div className="mx-auto w-56 pt-10">
              <Note look={makeLook("empty")}>
                {filter && filter !== "upcoming" ? (
                  <>
                    <h3 className="text-xl leading-tight font-bold">
                      Nothing {PINBOARD_FILTERS.find((f) => f.value === filter)?.label.toLowerCase()}
                    </h3>
                    <p className="font-sans text-sm text-stone-600">Try a wider range.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl leading-tight font-bold">Nothing pinned yet</h3>
                    <p className="font-sans text-sm text-stone-600">New events will show up here.</p>
                  </>
                )}
                {emptyAction ? <div className="mt-1 font-sans">{emptyAction}</div> : null}
              </Note>
            </div>
          ) : (
            <div className="flex items-start gap-4 sm:gap-6 md:gap-8">
              {columns.map((col, c) => (
                <ul key={c} className="flex min-w-0 flex-1 flex-col gap-6 sm:gap-8">
                  {col.items.map((slot, row) => {
                    const delay = c * 80 + (row % 3) * 40
                    return (
                      <li key={slot.key}>
                        {slot.event ? (
                          <Pinned
                            look={slot.look}
                            delay={delay}
                            tone={slot.event.imageUrl ? "#fffdf8" : slot.look.paper}
                            paperStyle={slot.event.imageUrl ? undefined : { aspectRatio: `1 / ${slot.look.ratio}` }}
                          >
                            {link(slot.event, <PosterBody event={slot.event} look={slot.look} />)}
                          </Pinned>
                        ) : (
                          <Pinned
                            look={slot.look}
                            delay={delay}
                            tone={slot.look.paper}
                            paperStyle={{ aspectRatio: `1 / ${slot.look.ratio + 0.35}` }}
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
                <p className="text-base leading-snug font-bold text-balance">That&rsquo;s everything on the board</p>
              </Note>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
