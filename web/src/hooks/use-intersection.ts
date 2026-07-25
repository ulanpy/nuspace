import { useEffect, useRef } from "react"

/**
 * Calls `onIntersect` when the returned ref enters the viewport. Used to load
 * the next page of an infinite list without a "load more" button.
 *
 * `rootMargin` starts the fetch before the sentinel is actually visible, so
 * the next page is usually in flight by the time the user reaches the bottom.
 */
export function useIntersection<T extends HTMLElement>(
  onIntersect: () => void,
  { enabled = true, rootMargin = "400px" } = {}
) {
  const ref = useRef<T | null>(null)
  // Kept in a ref so a new closure each render does not re-create the observer.
  const callback = useRef(onIntersect)
  callback.current = onIntersect

  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current()
      },
      { rootMargin }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [enabled, rootMargin])

  return ref
}
