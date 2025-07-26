import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
export const campuscurrentAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ["nuEvents", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Club, "communities">>(
        `/` + Routes.COMMUNITIES)
    },
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["nuEvents", "community", id],
      queryFn: () => {
        return apiCall<NuEvents.Club>(`/` + Routes.COMMUNITIES+ `/${id}`)
      }
    })
  }, 
  editCommunity: (id: string, data: NuEvents.Club) => {
    return apiCall<NuEvents.Club>(`/` + Routes.COMMUNITIES+ `/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}