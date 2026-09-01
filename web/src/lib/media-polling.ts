/**
 * Waiting for an entity's images to actually exist.
 *
 * This is required, not belt-and-braces. In production the client's PUT goes
 * straight to Google Cloud Storage; the `Media` row is only written when GCS
 * notifies Pub/Sub and Pub/Sub calls `POST /bucket/gcs-hook`. That happens
 * *after* the PUT resolves, so awaiting the upload proves the bytes arrived and
 * nothing more — refetching the entity right afterwards legitimately returns it
 * with an empty `media` array.
 *
 * Locally the emulator has no Pub/Sub, so the backend creates the row up front
 * at signing time and the race never appears. The awkward consequence is that
 * removing this code would look completely fine in development. See the note in
 * `features/media/api.ts`.
 */

/** Retry shape ported from the old app's `utils/polling.ts`. */
const DEFAULT_ATTEMPTS = 5
const INITIAL_DELAY_MS = 1000
const MAX_DELAY_MS = 10_000
const BACKOFF_RATE = 1.5

export interface PollForMediaOptions<T> {
  /** Refetches the entity. Called once per attempt. */
  fetch: () => Promise<T>
  /** Whether the fetched entity now carries the media we are waiting for. */
  isReady: (value: T) => boolean
  /** Total number of fetches, including the first. */
  attempts?: number
  signal?: AbortSignal
}

/**
 * Refetches until `isReady`, backing off between attempts.
 *
 * Resolves with the ready entity, or `null` if it never arrived within the
 * attempt budget. Running out is not an error: the upload succeeded and the
 * hook is merely slow, so callers should invalidate and let the image show up
 * on the next natural refetch rather than telling the user something broke.
 *
 * A fetch that throws counts as "not ready yet" rather than aborting the poll.
 * The entity has already been created at this point — a transient failure while
 * checking on its images is not worth surfacing as a failed submission.
 */
export async function pollForMedia<T>({
  fetch,
  isReady,
  attempts = DEFAULT_ATTEMPTS,
  signal,
}: PollForMediaOptions<T>): Promise<T | null> {
  let delay = INITIAL_DELAY_MS

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return null

    try {
      const value = await fetch()
      if (isReady(value)) return value
    } catch {
      // Deliberately ignored — see above.
    }

    if (attempt < attempts - 1) {
      await sleep(delay, signal)
      delay = Math.min(delay * BACKOFF_RATE, MAX_DELAY_MS)
    }
  }

  return null
}

/** Whether an entity carries at least one image in the given format. */
export function hasMediaFormat(
  media: readonly { media_format: string }[] | null | undefined,
  format: string
): boolean {
  return media?.some((item) => item.media_format === format) ?? false
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, ms)
    signal?.addEventListener("abort", finish, { once: true })

    function finish() {
      clearTimeout(timer)
      signal?.removeEventListener("abort", finish)
      resolve()
    }
  })
}
