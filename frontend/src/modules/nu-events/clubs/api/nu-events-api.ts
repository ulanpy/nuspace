import { apiCall } from "@/api/api"

export const nuEventsAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ['nuEvents', 'communities'],
    queryFn: async () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Club, "communities">>('/communities')
    }
  }
}