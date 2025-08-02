import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";

export const campuscurrentAPI = {
  getEventsQueryOptions: {
    queryKey: ["nuEvents", "events"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<NuEvents.Event, "events">>(
        `/` + Routes.EVENTS + `?event_status=approved`,
      );
    },
  },
  getEventQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["nuEvents", "event", id],
      queryFn: () => {
        return apiCall<NuEvents.Event>(`/` + Routes.EVENTS + `/${id}`);
      },
    });
  },
  editEvent: (id: string, data: NuEvents.Event) => {
    return apiCall<NuEvents.Event>(`/` + Routes.EVENTS + `/${id}`, {
      method: "PUT",
      json: data,
    });
  },
};
