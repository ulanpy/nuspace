import { queryOptions } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type {
  CommunityCategory,
  CommunityType,
} from "@/features/communities/types"

export interface CommunityFilters {
  community_type?: CommunityType
  community_category?: CommunityCategory
  keyword?: string
}

/** One page of the communities list. Used by useInfiniteList. */
export function fetchCommunitiesPage(
  filters: CommunityFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/communities", {
      params: { query: { page, size, ...filters } },
    })
  )
}

/**
 * Communities the signed-in user heads.
 *
 * The filter is `head_sub`, and `"me"` resolves to the caller server-side. The
 * old app sent `head=<sub>` — a parameter the backend does not declare, so
 * FastAPI dropped it and the profile page's "My Communities" was really the
 * first 100 of every community on campus.
 */
export function myCommunitiesQueryOptions() {
  return queryOptions({
    queryKey: qk.communities.mine(),
    queryFn: () =>
      unwrap(
        api.GET("/communities", {
          params: { query: { head_sub: "me", page: 1, size: 100 } },
        })
      ),
  })
}

export function communityDetailQueryOptions(communityId: number) {
  return queryOptions({
    queryKey: qk.communities.detail(communityId),
    queryFn: () =>
      unwrap(
        api.GET("/communities/{community_id}", {
          params: { path: { community_id: communityId } },
        })
      ),
  })
}
