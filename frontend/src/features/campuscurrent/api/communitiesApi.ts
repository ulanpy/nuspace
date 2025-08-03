import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";
export const campuscurrentAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ["campusCurrent", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<Community, "communities">>(
        `/` + Routes.COMMUNITIES)
    },
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", id],
      queryFn: () => {
        return apiCall<Community>(`/` + Routes.COMMUNITIES+ `/${id}`)
      }
    })
  }, 
  editCommunity: (id: string, data: Community) => {
    return apiCall<Community>(`/` + Routes.COMMUNITIES+ `/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}