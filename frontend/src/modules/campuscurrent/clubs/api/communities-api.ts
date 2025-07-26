import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";
import { ROUTES } from "@/data/routes";
export const nuEventsAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ["nuEvents", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Club, "communities">>(
        `${ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}`,
      );
    },
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["nuEvents", "community", id],
      queryFn: () => {
        return apiCall<NuEvents.Club>(`${ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}/${id}`)
      }
    })
  }, 
  editCommunity: (id: string, data: NuEvents.Club) => {
    return apiCall<NuEvents.Club>(`${ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES}/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}