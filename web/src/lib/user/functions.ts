import { queryOptions } from "@tanstack/react-query"

import { ApiError, api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { sessionSchema } from "./constants"
import type { Session } from "./types"

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
