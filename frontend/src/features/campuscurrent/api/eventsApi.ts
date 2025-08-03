import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";

export const campuscurrentAPI = {
  getEventsQueryOptions: (params: { start_date?: string; end_date?: string }) => {
    const queryParams = new URLSearchParams({
      event_status: "approved",
    });

    if (params.start_date) {
      queryParams.append("start_date", params.start_date);
    }
    if (params.end_date) {
      queryParams.append("end_date", params.end_date);
    }

    return {
      queryKey: ["campusCurrent", "events", params],
      queryFn: () => {
        return apiCall<Types.PaginatedResponse<CampusCurrent.Event, "events">>(
          `/` + Routes.EVENTS + `?` + queryParams.toString(),
        );
      },
    };
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
