import { api, unwrap } from "@/api/client"
import type { OpportunityType } from "@/features/opportunities/types"

export interface OpportunityFilters {
  type?: OpportunityType[]
  q?: string
  hide_expired?: boolean
}

/** One page of the opportunities digest. Used by useInfiniteList. */
export function fetchOpportunitiesPage(
  filters: OpportunityFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/opportunities", {
      params: { query: { page, size, ...filters } },
    })
  )
}
