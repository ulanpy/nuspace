import { useSuspenseQuery } from "@tanstack/react-query"

import { sessionQueryOptions } from "@/lib/user/functions"
import type { CurrentUser, Session } from "@/lib/user/types"

/** The current session, or null when signed out. */
export function useSession(): Session | null {
  return useSuspenseQuery(sessionQueryOptions).data
}

/**
 * The signed-in user, throwing when there is no session.
 *
 * `_app` deliberately leaves browsing public, so there is no layout-level
 * guard to rely on: a route must resolve a session itself before calling this.
 * Use `useSession` where anonymous visitors are legitimate.
 */
export function useCurrentUser(): CurrentUser {
  const session = useSession()
  if (!session) {
    throw new Error(
      "useCurrentUser called outside an authenticated route. Use useSession in public routes."
    )
  }
  return session.user
}

/**
 * Permission checks derived from the user's role and scopes, so authorization
 * lives in one place.
 */
export function usePermissions() {
  const session = useSession()
  const user = session?.user

  const role = user?.role ?? "default"
  const isAdmin = role === "admin"
  // boss > capo > soldier is the Student Government hierarchy.
  const isSgMember = role === "boss" || role === "capo" || role === "soldier"

  return {
    role,
    isAdmin,
    isSgMember,
    isSgLead: role === "boss",
    hasTelegramLinked: session?.tg_id != null,
  }
}
