import { apiCall } from "@/api/api"
import { queryOptions } from "@tanstack/react-query"

export const nuEventsAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ['nuEvents', 'communities'],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Club, "communities">>('/communities')
    }
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ['nuEvents', 'community', id],
      queryFn: () => {
        return apiCall<NuEvents.Club>(`/communities/${id}`)
      }
    })
  }
}