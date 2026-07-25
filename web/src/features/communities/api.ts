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
