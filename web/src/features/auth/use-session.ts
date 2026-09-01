import { useSuspenseQuery } from "@tanstack/react-query"

import { sessionQueryOptions } from "@/features/auth/api"
import type { CurrentUser, Session } from "@/features/auth/schema"

/** The current session, or null when signed out. */
export function useSession(): Session | null {
  return useSuspenseQuery(sessionQueryOptions).data
}

/**
 * The signed-in user. Only valid under the `_app` layout route, whose
 * beforeLoad guard has already redirected anonymous visitors away — so this
 * throws rather than returning null and forcing every caller to re-check.
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
 * Addresses the backend lets manage opportunities regardless of role, copied
 * from `OpportunityPolicy.ALLOWED_EMAILS`.
 *
 * `bob@example.com` is in the backend set and is kept here deliberately: this
 * mirrors the server, and dropping it would only hide the button from an
 * account the server still authorises. Removing it is a backend change.
 */
const OPPORTUNITY_EMAILS = new Set([
  "ministry.innovations@nu.edu.kz",
  "bob@example.com",
])

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
    /** True when the user heads this community, or is an admin. */
    canManageCommunity: (communityId: number) =>
      isAdmin || (user?.communities.includes(communityId) ?? false),
    /**
     * Authoring the opportunities digest. Mirrors
     * `backend/modules/opportunities/policy.py` exactly: the allowlist is not
     * an authorization mechanism on its own — the server checks the same thing
     * — but showing the button to someone the server will refuse is the bug the
     * old app had, so the two must agree. If the policy changes, change it
     * there first and follow here.
     */
    canManageOpportunities:
      isAdmin ||
      role === "boss" ||
      (user != null && OPPORTUNITY_EMAILS.has(user.email)),
  }
}
