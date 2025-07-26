import { apiCall } from "@/api/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
export const campuscurrentAPI = {
  getEventsQueryOptions: {
    queryKey: ["nuEvents", "events"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Club, "events">>(
        Routes.EVENTS)
    },
  },
  getEventQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["nuEvents", "community", id],
      queryFn: () => {
        return apiCall<NuEvents.Club>(Routes.EVENTS + `/${id}`)
      }
    })
  }, 
  editEvent: (id: string, data: NuEvents.Club) => {
    return apiCall<NuEvents.Club>(Routes.EVENTS + `/${id}`, {
      method: 'PUT',
      json: data
    })
  },
}