import { useSyncExternalStore } from "react"

const listeners = new Set<() => void>()
let snapshot = Date.now()
let timer: number | null = null

function refresh() {
  snapshot = Date.now()
  for (const listener of listeners) listener()
}

function handleVisibilityChange() {
  if (document.visibilityState !== "hidden") refresh()
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  if (listeners.size === 1) {
    snapshot = Date.now()
    timer = window.setInterval(refresh, 30_000)
    document.addEventListener("visibilitychange", handleVisibilityChange)
  }

  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer)
      timer = null
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }
}

function getSnapshot() {
  return snapshot
}

/**
 * One shared clock for coarse countdowns.
 *
 * Every event card reads the same external store instead of starting its own
 * interval. It also refreshes as soon as a backgrounded tab becomes visible.
 */
export function useMinuteNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
