import { useSyncExternalStore } from "react"

/** Tailwind's `xl` breakpoint, where the opportunities rail goes sticky. */
const WIDE_QUERY = "(min-width: 80rem)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(WIDE_QUERY)
  media.addEventListener("change", onChange)
  return () => {
    media.removeEventListener("change", onChange)
  }
}

/** True from the `xl` breakpoint up. */
export function useIsWide() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false
  )
}
