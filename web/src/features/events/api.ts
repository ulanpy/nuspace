import { queryOptions } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type { EventType, RegistrationPolicy } from "@/features/events/types"

export type TimeFilter = "upcoming" | "today" | "week" | "month"

export interface EventFilters {
  time_filter?: TimeFilter
  event_type?: EventType
  registration_policy?: RegistrationPolicy
  keyword?: string
}

/** One page of the events list. Used by useInfiniteList. */
export function fetchEventsPage(
  filters: EventFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/events", {
      params: { query: { page, size, ...filters } },
    })
  )
}

export function eventDetailQueryOptions(eventId: number) {
  return queryOptions({
    queryKey: qk.events.detail(eventId),
    queryFn: () =>
      unwrap(
        api.GET("/events/{event_id}", {
          params: { path: { event_id: eventId } },
        })
      ),
  })
}
