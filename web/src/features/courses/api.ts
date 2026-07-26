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

/**
 * Terms the planner can build against, newest first.
 *
 * The current term is whatever this returns — Fall 2026 is `825` today, and it
 * changes every semester. Nothing may hardcode that value: a literal term id
 * works until the registrar rolls over and then silently searches an empty
 * catalog, which looks like "no courses found" rather than like a bug.
 */
export function semestersQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.semesters(),
    queryFn: () => unwrap(api.GET("/planner/semesters")),
    // Terms roll over once a semester; no reason to refetch within a session.
    staleTime: Infinity,
  })
}

/** The weekly timetable, used for professor names and the schedule view. */
export function scheduleQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.schedule(),
    queryFn: () => unwrap(api.GET("/registered_courses/schedule")),
  })
}
