import { queryOptions } from "@tanstack/react-query"

import { ApiError, api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { type Session, sessionSchema } from "@/features/auth/schema"
import {
  currentBrowserPath,
  loginHref,
  requestLogout,
} from "@/features/auth/navigation"

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
