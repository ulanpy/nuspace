import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";

export const campuscurrentAPI = {
  getEventsQueryOptions: {
    queryKey: ["campusCurrent", "events"],
    queryFn: () => {
      return apiCall<Types.PaginatedResponse<CampusCurrent.Event, "events">>(
        `/` + Routes.EVENTS + `?event_status=approved`,
      );
    },
  },
  getEventQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "event", id],
      queryFn: () => {
        return apiCall<CampusCurrent.Event>(`/` + Routes.EVENTS + `/${id}`);
      },
    });
  },
  editEvent: (id: string, data: CampusCurrent.Event) => {
    return apiCall<CampusCurrent.Event>(`/` + Routes.EVENTS + `/${id}`, {
      method: "PUT",
      json: data,
    });
  },
};
