import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type {
  OpportunityCreate,
  OpportunityType,
  OpportunityUpdate,
} from "@/features/opportunities/types"

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

/**
 * Every mutation invalidates the whole `opportunities` key rather than the one
 * list it came from. The digest is filtered and paginated, an edit can move a
 * record between pages or out of the active filter entirely, and the list is
 * small enough that a refetch costs nothing worth optimising.
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: OpportunityCreate) =>
      unwrap(api.POST("/opportunities", { body })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: OpportunityUpdate }) =>
      unwrap(
        api.PATCH("/opportunities/{id}", { params: { path: { id } }, body })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/opportunities/{id}", { params: { path: { id } } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}
