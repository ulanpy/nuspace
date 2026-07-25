import { queryOptions } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type {
  EventStatus,
  EventType,
  RegistrationPolicy,
} from "@/features/events/types"

export type TimeFilter = "upcoming" | "today" | "week" | "month"

export interface EventFilters {
  time_filter?: TimeFilter
  event_type?: EventType
  registration_policy?: RegistrationPolicy
  event_status?: EventStatus
  keyword?: string
}

/**
 * One page of the events list. Used by useInfiniteList.
 *
 * `event_status` must be sent: the backend rejects an unfiltered list for
 * non-privileged users with 403 "You can only view approved or cancelled
 * events", so omitting it breaks the page for every student.
 */
export function fetchEventsPage(
  filters: EventFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/events", {
      params: {
        query: { page, size, event_status: "approved", ...filters },
      },
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
