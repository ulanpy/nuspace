import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import { CreateEventData, EditEventData, Event } from "@/features/campuscurrent/types/types";

export type TimeFilter = "upcoming" | "today" | "week" | "month";

export const campuscurrentAPI = {
  getEventsQueryOptions: (params: {
    time_filter?: TimeFilter;
    start_date?: string;
    end_date?: string;
    page?: number;
    size?: number;
    registration_policy?: string | null;
    event_scope?: string | null;
    event_type?: string | null;
    event_status?: string | null;
    community_id?: number | null;
    creator_sub?: string | null;
    keyword?: string | null;
  }) => {
    const queryParams = new URLSearchParams();

    // Access policy: by default we show approved events in the public listing
    queryParams.set("event_status", params.event_status ?? "approved");

    // Use time_filter if provided, otherwise fall back to start_date/end_date
    if (params.time_filter) {
      queryParams.set("time_filter", params.time_filter);
    } else {
      if (params.start_date) queryParams.set("start_date", params.start_date);
      if (params.end_date) queryParams.set("end_date", params.end_date);
    }

    // Pagination
    queryParams.set("page", String(params.page ?? 1));
    queryParams.set("size", String(params.size ?? 20));

    // Optional filters
    if (params.registration_policy)
      queryParams.set("registration_policy", String(params.registration_policy));
    if (params.event_scope) queryParams.set("event_scope", String(params.event_scope));
    if (params.event_type) queryParams.set("event_type", String(params.event_type));
    if (params.community_id != null)
      queryParams.set("community_id", String(params.community_id));
    if (params.creator_sub) queryParams.set("creator_sub", String(params.creator_sub));
    if (params.keyword) queryParams.set("keyword", String(params.keyword));

    return {
      queryKey: ["campusCurrent", "events", params],
      queryFn: async () => {
        const res = await apiCall<any>(
          `/` + Routes.EVENTS + `?` + queryParams.toString(),
        );
        // Normalize num_of_pages -> total_pages for backward compatibility
        if (
          res &&
          typeof res.total_pages !== "number" &&
          typeof res.num_of_pages === "number"
        ) {
          res.total_pages = res.num_of_pages;
        }
        return res as Types.PaginatedResponse<Event, "events">;
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
  editEvent: (id: string, data: EditEventData) => {
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
