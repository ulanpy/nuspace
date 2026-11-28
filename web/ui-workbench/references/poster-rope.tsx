import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PosterEvent = {
  id: string | number
  title: string
  /** Pre-formatted, e.g. "Sat, Oct 24". Formatting is left to you to avoid SSR/timezone mismatches. */
  dateLabel?: string
  location?: string
  imageUrl?: string | null
  href?: string
}

type PosterRopeProps = {
  events: PosterEvent[]
  /** Wrap the poster face in your router link. Defaults to a plain <a href>. */
  renderLink?: (event: PosterEvent, children: React.ReactNode) => React.ReactNode
  label?: string
  className?: string
}

/** Use on your own link element so focus rings match the poster shape. */
export const posterLinkClass =
  "block rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"

// Each poster hangs a little differently so the line doesn't look stamped out.
const TILTS = [-2, 1.5, -1, 2.5, -1.5, 1]
const SWING = [1, 0.75, 1.25, 0.9, 1.1, 0.8]
const RATIOS = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[3/4]", "aspect-[5/6]", "aspect-[4/5]", "aspect-[3/4]"]

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * - Wheel over the scroller moves it sideways (smoothed). At either end the wheel
 *   is released so the page keeps scrolling.
 * - Touch uses native scrolling (momentum, swipe).
 * - Mouse can click-and-drag.
 * - Any scroll, from any source, sets --sway on the scroller, which swings the posters.
 */
function useRopeScroll(ref: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduce = prefersReducedMotion()

    let pos = el.scrollLeft // float position we animate
    let target = pos
    let raf = 0
    let lastLeft = pos
    let settle = 0

    const onScroll = () => {
      const dx = el.scrollLeft - lastLeft
      lastLeft = el.scrollLeft
      if (!raf) {
        // scrolled by touch, keyboard, buttons or drag: resync
        pos = el.scrollLeft
        target = pos
      }
      if (reduce) return
      el.style.setProperty("--sway", `${clamp(-dx * 0.5, -9, 9)}deg`)
      window.clearTimeout(settle)
      settle = window.setTimeout(() => el.style.setProperty("--sway", "0deg"), 90)
    }

    const tick = () => {
      const diff = target - pos
      if (Math.abs(diff) < 0.5) {
        pos = target
        el.scrollLeft = pos
        raf = 0
        return
      }
      pos += diff * 0.14
      el.scrollLeft = pos
      raf = requestAnimationFrame(tick)
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // pinch-zoom
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return

      let delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (e.deltaMode === 1) delta *= 16
      else if (e.deltaMode === 2) delta *= el.clientWidth

      if (!raf) {
        pos = el.scrollLeft
        target = pos
      }
      const next = clamp(target + delta, 0, max)
      if (next === target) return // at an edge: let the page scroll

      e.preventDefault()
      target = next
      if (reduce) {
        pos = target
        el.scrollLeft = target
        return
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // Mouse drag (touch and pen use native scrolling)
    let down = false
    let moved = false
    let startX = 0
    let startLeft = 0

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return
      down = true
      moved = false
      startX = e.clientX
      startLeft = el.scrollLeft
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) > 5) {
        moved = true
        el.setPointerCapture(e.pointerId)
        el.dataset.dragging = "true"
      }
      if (moved) {
        cancelAnimationFrame(raf)
        raf = 0
        el.scrollLeft = startLeft - dx
      }
    }
    const onPointerEnd = () => {
      down = false
      delete el.dataset.dragging
    }
    const onClickCapture = (e: MouseEvent) => {
      if (!moved) return
      e.preventDefault()
      e.stopPropagation()
      moved = false
    }
    const onDragStart = (e: Event) => e.preventDefault()

    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("pointerdown", onPointerDown)
    el.addEventListener("pointermove", onPointerMove)
    el.addEventListener("pointerup", onPointerEnd)
    el.addEventListener("pointercancel", onPointerEnd)
    el.addEventListener("click", onClickCapture, true)
    el.addEventListener("dragstart", onDragStart)

    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(settle)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("pointerdown", onPointerDown)
      el.removeEventListener("pointermove", onPointerMove)
      el.removeEventListener("pointerup", onPointerEnd)
      el.removeEventListener("pointercancel", onPointerEnd)
      el.removeEventListener("click", onClickCapture, true)
      el.removeEventListener("dragstart", onDragStart)
    }
  }, [ref])
}

/** One sagging stretch of rope. Neighbouring segments meet at the same height. */
function RopeSegment() {
  const d = "M0 4 Q50 20 100 4"
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 28"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-0 h-7 w-full overflow-visible text-amber-800/70 dark:text-amber-200/50"
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <path
        d={d}
        fill="none"
        stroke="rgb(0 0 0 / 0.25)"
        strokeWidth="3"
        strokeDasharray="1.5 4"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function Clothespin({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -top-3 z-10 h-6 w-2.5 rounded-[2px] bg-amber-300 shadow-sm ring-1 ring-amber-900/30 dark:bg-amber-600",
        className,
      )}
    />
  )
}

function PosterFace({ event, ratio }: { event: PosterEvent; ratio: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[3px] bg-linear-to-br from-primary to-primary/60 shadow-lg shadow-black/25 ring-1 ring-black/10 select-none",
        ratio,
      )}
    >
      {event.imageUrl ? (
        <img
          src={event.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-3 text-white">
        {event.dateLabel ? <p className="text-xs font-medium text-white/80">{event.dateLabel}</p> : null}
        <h3 className="line-clamp-2 text-base leading-tight font-semibold text-balance">{event.title}</h3>
        {event.location ? <p className="mt-0.5 truncate text-xs text-white/70">{event.location}</p> : null}
      </div>
    </div>
  )
}

export function PosterRope({ events, renderLink, label = "Events", className }: PosterRopeProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  useRopeScroll(scrollerRef)

  const nudge = (dir: 1 | -1) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: prefersReducedMotion() ? "auto" : "smooth" })
  }

  const link =
    renderLink ??
    ((event: PosterEvent, children: React.ReactNode) =>
      event.href ? (
        <a href={event.href} draggable={false} className={posterLinkClass}>
          {children}
        </a>
      ) : (
        <div>{children}</div>
      ))

  if (events.length === 0) return null

  const fade = "linear-gradient(to right, transparent, #000 1.5rem, #000 calc(100% - 1.5rem), transparent)"

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault()
            nudge(1)
          } else if (e.key === "ArrowLeft") {
            e.preventDefault()
            nudge(-1)
          }
        }}
        style={{ maskImage: fade, WebkitMaskImage: fade }}
        className="cursor-grab overflow-x-auto overscroll-x-contain rounded-md outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring data-[dragging=true]:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        <ul className="relative flex w-max px-6 pt-1 pb-10 md:px-12">
          {/* nails at both ends of the rope */}
          <span
            aria-hidden
            className="absolute top-0.5 left-6 size-3 -translate-x-1/2 rounded-full bg-amber-900/70 md:left-12 dark:bg-amber-200/50"
          />
          <span
            aria-hidden
            className="absolute top-0.5 right-6 size-3 translate-x-1/2 rounded-full bg-amber-900/70 md:right-12 dark:bg-amber-200/50"
          />

          {events.map((event, i) => (
            <li key={event.id} className="relative shrink-0 px-3">
              <RopeSegment />
              <div
                className="relative mt-3 w-[min(62vw,15rem)] origin-top transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
                style={
                  {
                    "--k": SWING[i % SWING.length],
                    "--tilt": `${TILTS[i % TILTS.length]}deg`,
                    transform: "rotate(calc(var(--sway, 0deg) * var(--k) + var(--tilt)))",
                  } as React.CSSProperties
                }
              >
                <Clothespin className="left-[18%]" />
                <Clothespin className="right-[18%]" />
                {link(event, <PosterFace event={event} ratio={RATIOS[i % RATIOS.length]} />)}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Scroll left"
        onClick={() => nudge(-1)}
        className="absolute top-1/2 left-1 hidden -translate-y-1/2 rounded-full shadow-md md:inline-flex"
      >
        <ChevronLeft />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Scroll right"
        onClick={() => nudge(1)}
        className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-full shadow-md md:inline-flex"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
