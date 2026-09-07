import { useEffect, useReducer } from "react"

import { resolveFileUrls } from "@/lib/media"

/**
 * Resolve raw GCS filenames to displayable URLs with a module-level cache.
 *
 * Page content persists filenames (signed URLs expire ~15 min), so URLs are
 * reconstructed on demand via POST /media/resolve-urls. All unresolved names
 * are collected over one tick and sent to the API in a single batch; results
 * are cached globally so re-renders (editor canvas, public page) never hit the
 * network again.
 */
const cache = new Map<string, string>()
const pending = new Set<string>()
const listeners = new Set<() => void>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, 0)
}

async function flush() {
  if (!pending.size) return
  const batch = [...pending]
  pending.clear()
  try {
    const urls = await resolveFileUrls(batch)
    for (const [key, value] of Object.entries(urls)) cache.set(key, value)
    for (const listener of listeners) listener()
  } catch {
    // Leave unresolved; a later mount will retry.
  }
}

export function useResolvedFileUrl(filename: string): string | undefined {
  const [, notify] = useReducer((n: number) => n + 1, 0)

  if (filename && !cache.has(filename)) {
    pending.add(filename)
    scheduleFlush()
  }

  useEffect(() => {
    listeners.add(notify)
    return () => {
      listeners.delete(notify)
    }
  }, [])

  return filename ? cache.get(filename) : undefined
}
