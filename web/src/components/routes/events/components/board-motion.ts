import { useEffect, useState, useSyncExternalStore } from "react"
import type { RefObject } from "react"

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)")
      query.addEventListener("change", notify)
      return () => {
        query.removeEventListener("change", notify)
      }
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  )
}

/** Two columns on a phone, three from `md`, four from `xl`. */
export function useColumnCount() {
  return useSyncExternalStore(
    (notify) => {
      const queries = [
        window.matchMedia("(min-width: 768px)"),
        window.matchMedia("(min-width: 1280px)"),
      ]
      for (const query of queries) query.addEventListener("change", notify)
      return () => {
        for (const query of queries) {
          query.removeEventListener("change", notify)
        }
      }
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
export function useInViewOnce(
  ref: RefObject<Element | null>,
  skip: boolean
): boolean {
  const [seen, setSeen] = useState(false)

  useEffect(() => {
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

/**
 * Scrolling the page jostles the board and the papers settle again. Writes a
 * CSS variable rather than state, so a scroll never re-renders the posters.
 */
export function useBoardSway(
  ref: RefObject<HTMLElement | null>,
  disabled: boolean
) {
  useEffect(() => {
    const element = ref.current
    if (!element || disabled) return undefined
    let last = window.scrollY
    let timer = 0

    const onScroll = () => {
      const delta = window.scrollY - last
      last = window.scrollY
      element.style.setProperty(
        "--sway",
        `${Math.max(-3.5, Math.min(3.5, delta * 0.09))}deg`
      )
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        element.style.setProperty("--sway", "0deg")
      }, 80)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(timer)
    }
  }, [ref, disabled])
}
