import { queryOptions } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

/**
 * The student's registered courses, each with its graded items.
 *
 * Populated by syncing with the registrar rather than by hand, so an empty list
 * means "not synced yet" far more often than "no courses".
 */
export function registeredCoursesQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.registered(),
    queryFn: () => unwrap(api.GET("/registered_courses")),
  })
}

/** The weekly timetable, used for professor names and the schedule view. */
export function scheduleQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.schedule(),
    queryFn: () => unwrap(api.GET("/registered_courses/schedule")),
  })
}
