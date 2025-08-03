import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
export const campuscurrentAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ["campusCurrent", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<CampusCurrent.Club, "communities">>(
        `/` + Routes.COMMUNITIES)
    },
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", id],
      queryFn: () => {
        return apiCall<CampusCurrent.Club>(`/` + Routes.COMMUNITIES+ `/${id}`)
      }
    })
  }, 
  editCommunity: (id: string, data: CampusCurrent.Club) => {
    return apiCall<CampusCurrent.Club>(`/` + Routes.COMMUNITIES+ `/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}