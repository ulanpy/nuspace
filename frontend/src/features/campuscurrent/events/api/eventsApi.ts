import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import { CreateEventData, Event } from "@/features/campuscurrent/types/types";
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
        return apiCall<Types.PaginatedResponse<Event, "events">>(
          `/` + Routes.EVENTS + `?` + queryParams.toString(),
        );
      },
    };
  },
  getEventQueryOptions: (id: string) => {
    return queryOptions({
      queryKey: ["campusCurrent", "event", id],
      queryFn: () => {
        return apiCall<Event>(`/` + Routes.EVENTS + `/${id}`);
      },
    });
  },
  addEvent: (data: CreateEventData) => {
    return apiCall<Event>(`/` + Routes.EVENTS, {
      method: "POST",
      json: data,
    });
  },
  editEvent: (id: string, data: Event) => {
    return apiCall<Event>(`/` + Routes.EVENTS + `/${id}`, {
      method: "PATCH",
      json: data,
    });
  },
  deleteEvent: (id: string) => {
    return apiCall<void>(`/` + Routes.EVENTS + `/${id}`, {
      method: "DELETE",
    });
  },
};
