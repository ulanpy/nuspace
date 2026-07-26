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
 * Permission checks derived from the user's role and scopes, so authorization
 * lives in one place. The old app gated opportunity authoring on a hardcoded
 * client-side email allowlist that still contained bob@example.com.
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
     * Authoring the opportunities digest. Admin-only is provisional — it
     * replaces a hardcoded email allowlist that was never an authorization
     * mechanism, but nobody has decided yet whether community heads or SG
     * members should be able to post too. Widening it should stay a change to
     * this line, so resist inlining role checks at call sites.
     */
    canManageOpportunities: isAdmin,
    canDelegateTickets: isAdmin || role === "boss" || role === "capo",
  }
}
