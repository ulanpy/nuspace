import { apiCall } from "@/utils/api";
import { queryOptions } from "@tanstack/react-query";
import * as Routes from "@/data/routes";
import {
  CreateEventData,
  EditEventData,
  Event,
  EventAccessInvite,
  EventAccessInviteAcceptResponse,
  EventAccessInviteCreated,
  EventAccessPurpose,
  EventGoingResponse,
} from "@/features/shared/campus/types";

export type TimeFilter = "upcoming" | "today" | "week" | "month";

export const campuscurrentAPI = {
  getEventsQueryOptions: (params: {
    time_filter?: TimeFilter;
    start_date?: string;
    end_date?: string;
    page?: number;
    size?: number;
    registration_policy?: string | null;
    event_type?: string | null;
    event_status?: string | null;
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
    if (params.event_type) queryParams.set("event_type", String(params.event_type));
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
        const items = (res as any)?.items ?? [];
        return { ...res, items } as Types.PaginatedResponse<Event>;
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
  setGoing: (id: string) => {
    return apiCall<EventGoingResponse>(`/` + Routes.EVENTS + `/${id}/going`, {
      method: "PUT",
    });
  },
  unsetGoing: (id: string) => {
    return apiCall<EventGoingResponse>(`/` + Routes.EVENTS + `/${id}/going`, {
      method: "DELETE",
    });
  },
  createAccessInvite: (id: string, purpose: EventAccessPurpose) => {
    return apiCall<EventAccessInviteCreated>(
      `/` + Routes.EVENTS + `/${id}/access-invites`,
      { method: "POST", json: { purpose } },
    );
  },
  listAccessInvites: (id: string) => {
    return apiCall<{ items: EventAccessInvite[] }>(
      `/` + Routes.EVENTS + `/${id}/access-invites`,
    );
  },
  revokeAccessInvite: (id: string, inviteId: number) => {
    return apiCall<void>(
      `/` + Routes.EVENTS + `/${id}/access-invites/${inviteId}`,
      { method: "DELETE" },
    );
  },
  acceptAccessInvite: (token: string) => {
    return apiCall<EventAccessInviteAcceptResponse>(
      `/` + Routes.EVENTS + `/access-invites/accept`,
      { method: "POST", json: { token } },
    );
  },
};
