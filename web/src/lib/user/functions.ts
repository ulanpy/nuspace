import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { ApiError, api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { useMediaUpload, type UploadItem } from "@/hooks/use-media-upload"
import { assertValidImageBatch, pollForMedia, saveWithMedia } from "@/lib/media"
import { sessionSchema } from "./constants"
import type { Session, UserPageUpdate } from "./types"

/**
 * The session query. Resolves to null when nobody is signed in, rather than
 * throwing, so route guards and components can branch on a value.
 *
 * The old app tracked auth failure in a module-level `let globalQueryEnabled`
 * plus sessionStorage plus a forceUpdate counter, to stop React Query retrying
 * a 401 forever. None of that is needed: retry is off and a 401 is a normal
 * resolved state.
 */
export const sessionQueryOptions = queryOptions({
  queryKey: qk.session(),
  queryFn: async (): Promise<Session | null> => {
    try {
      const raw = await unwrap(api.GET("/me"))
      return sessionSchema.parse(raw)
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) return null
      throw error
    }
  },
  staleTime: 1000 * 60 * 5,
  retry: false,
})

/**
 * Login is a full-page navigation because the backend redirects through the
 * identity provider and back. The return target is relative because the
 * backend intentionally rejects absolute URLs.
 */
export function beginLogin(
  returnTo: string = currentBrowserPath(window.location),
  options: { reauthenticate?: boolean } = {}
) {
  window.location.href = loginHref({
    returnTo,
    origin: window.location.origin,
    reauthenticate: options.reauthenticate,
  })
}

export function beginReauthentication() {
  beginLogin(currentBrowserPath(window.location), { reauthenticate: true })
}

/**
 * Logout is a fetch, not a navigation: `/api/logout` clears cookies and returns
 * a plain 200 response. Navigating there strands the browser on the API body.
 */
export async function beginLogout() {
  await requestLogout()
  window.location.replace("/")
}

/**
 * Profile picture and banner, in one list.
 *
 * The same pairing `toCommunityUploadItems` does, and for the same reason: both
 * zones are `entity_type: users`, told apart only by their format.
 */
export function toUserUploadItems(
  profile: readonly File[],
  banner: readonly File[]
): UploadItem[] {
  return [
    ...profile.map((file, index) => ({
      file,
      mediaFormat: "profile" as const,
      mediaOrder: index,
    })),
    ...banner.map((file, index) => ({
      file,
      mediaFormat: "banner" as const,
      mediaOrder: index,
    })),
  ]
}

/** One page of the public directory. Used by useInfiniteList. */
export function fetchUsersPage(
  filters: { keyword?: string },
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/users", {
      params: { query: { page, size, ...filters } },
    })
  )
}

/** A public profile page. Private pages 404 for everyone but their owner. */
export function fetchUserPage(slug: string) {
  return unwrap(
    api.GET("/u/{slug}", {
      params: { path: { slug } },
    })
  )
}

export function userPageQueryOptions(slug: string) {
  return queryOptions({
    queryKey: qk.users.detail(slug),
    queryFn: () => fetchUserPage(slug),
  })
}

/**
 * Refreshes once the newly uploaded images exist server-side.
 *
 * Not awaited, for the reasons in `lib/media/functions.ts`: the PUT resolves
 * before GCS notifies Pub/Sub and the `Media` row exists.
 */
function refreshWhenMediaLands(
  queryClient: QueryClient,
  slug: string,
  expected: number
) {
  void pollForMedia({
    fetch: () => fetchUserPage(slug),
    isReady: (page) => page.media.length >= expected,
  }).then(async (page) => {
    if (page) {
      await queryClient.invalidateQueries({ queryKey: qk.users.all() })
    }
  })
}

/**
 * Saving one's own profile page.
 *
 * The durable PATCH runs first and the images follow, exactly as for
 * communities: the user's row already exists, so a failed upload after a
 * successful PATCH is a partial save and must not reject — re-submitting the
 * form would not fix the images, it would just repeat the PATCH.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient()
  const { uploadMedia } = useMediaUpload()

  return useMutation({
    mutationFn: async ({
      userId,
      body,
      items,
    }: {
      /** Surrogate `users.id` from the session — media uploads are keyed on it. */
      userId: number
      body: UserPageUpdate
      items: UploadItem[]
    }) => {
      return saveWithMedia({
        validate: () => {
          assertValidImageBatch(items.map((item) => item.file))
        },
        saveEntity: () =>
          unwrap(
            api.PATCH("/users/me", {
              body,
            })
          ),
        uploadMedia:
          items.length > 0
            ? async () => {
                const uploaded = await uploadMedia({
                  entityType: "users",
                  entityId: userId,
                  items,
                })
                return uploaded.length
              }
            : undefined,
      })
    },
    onSuccess: async (result) => {
      // The session holds this user's slug, page content and media, and the
      // General tab reads the session and nothing else.
      await queryClient.invalidateQueries({ queryKey: qk.session() })
      if (result.successfulUploadCount > 0) {
        // Counted from what survived the PATCH, so images deleted in the same
        // request are not waited for on top of the ones being added.
        refreshWhenMediaLands(
          queryClient,
          result.entity.slug,
          result.entity.media.length + result.successfulUploadCount
        )
      }
    },
  })
}

type BrowserLocation = Pick<Location, "origin" | "pathname" | "search" | "hash">

export function currentBrowserPath(location: BrowserLocation): string {
  return `${location.pathname}${location.search}${location.hash}`
}

/**
 * The backend accepts only same-site relative return paths. Normalizing here
 * keeps deep links while ensuring an externally supplied `returnTo` cannot
 * become an open redirect.
 */
export function loginHref({
  returnTo,
  origin,
  reauthenticate = false,
}: {
  returnTo: string
  origin: string
  reauthenticate?: boolean
}): string {
  let safeReturnTo = "/"
  try {
    const appOrigin = new URL(origin).origin
    const parsed = new URL(returnTo, appOrigin)
    if (parsed.origin === appOrigin) {
      safeReturnTo = `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // A malformed, user-controlled return target falls back to the app root.
  }
  const params = new URLSearchParams({ return_to: safeReturnTo })
  if (reauthenticate) params.set("reauth", "true")
  return `/api/login?${params.toString()}`
}

type LogoutFetcher = (
  input: string,
  init: RequestInit
) => Promise<Pick<Response, "ok" | "status" | "json">>

export class LogoutError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown) {
    super(
      `Logout failed with ${String(status)}: ${
        typeof detail === "object" && detail !== null && "detail" in detail
          ? String(detail.detail)
          : String(detail)
      }`
    )
    this.name = "LogoutError"
    this.status = status
    this.detail = detail
  }
}

export async function requestLogout(
  fetcher: LogoutFetcher = fetch
): Promise<void> {
  const response = await fetcher("/api/logout", {
    method: "GET",
    credentials: "include",
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => undefined)
    throw new LogoutError(response.status, detail)
  }
}
