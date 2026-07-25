import { queryOptions } from "@tanstack/react-query"

import { ApiError, api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import { type Session, sessionSchema } from "@/features/auth/schema"

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
 * Login and logout are full-page navigations, not fetches: the backend sets
 * httpOnly cookies and redirects back. `returnTo` round-trips through the
 * backend so a deep link survives the OAuth hop.
 */
export function beginLogin(returnTo: string = window.location.href) {
  window.location.href = `/api/login?return_to=${encodeURIComponent(returnTo)}`
}

export function beginLogout() {
  window.location.href = "/api/logout"
}
