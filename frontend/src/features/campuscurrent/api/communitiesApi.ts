import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import { ROUTES } from "@/data/routes";
import { Community } from "@/features/campuscurrent/types/types";
export const campuscurrentAPI = {
  getCommunitiesQueryOptions: {
    queryKey: ["campusCurrent", "communities"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<Community, "communities">>(
        `/` + ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES)
    },
  },
  getCommunityQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "community", id],
      queryFn: () => {
        return apiCall<Community>(`/` + ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES+ `/${id}`)
      }
    })
  }, 
  editCommunity: (id: string, data: Community) => {
    return apiCall<Community>(`/` + ROUTES.APPS.CAMPUS_CURRENT.COMMUNITIES+ `/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}