import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

import type { PlannerSchedule } from "./types"

/** The student's planner: the courses they're considering, with sections. */
export function plannerQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.planner(),
    queryFn: () => unwrap(api.GET("/planner")),
  })
}

/**
 * Catalog search within one term.
 *
 * `term_value` is required — omitting it returns a 422 that reads exactly like
 * an empty result set, so the caller must have a term before searching. The
 * query stays disabled until both are present rather than firing a request
 * that can only fail.
 */
export function courseSearchQueryOptions(term: string, courseCode: string) {
  const enabled = term.length > 0 && courseCode.length > 0

  return queryOptions({
    queryKey: qk.courses.catalog({ term, courseCode }),
    queryFn: () =>
      unwrap(
        api.GET("/planner/courses/search", {
          params: { query: { term_value: term, course_code: courseCode } },
        })
      ),
    enabled,
    // The catalog is republished once a semester; results are stable.
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Every planner mutation ends by refreshing the planner, since sections,
 * selections and capacity counts all live inside that one response. The server
 * result is written straight into the cache where we have it, so the grid
 * doesn't blank out and refetch on every click.
 */
function refreshPlanner(client: QueryClient, next?: PlannerSchedule) {
  if (next) client.setQueryData(qk.courses.planner(), next)
  return client.invalidateQueries({ queryKey: qk.courses.planner() })
}

export function useAddPlannerCourse() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: {
      course_code: string
      term_value: string
      term_label?: string | null
      level?: string | null
    }) => unwrap(api.POST("/planner/courses", { body })),
    onSuccess: () => refreshPlanner(client),
  })
}

export function useRemovePlannerCourse() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (courseId: number) =>
      unwrap<void>(
        api.DELETE("/planner/courses/{course_id}", {
          params: { path: { course_id: courseId } },
        })
      ),
    onSuccess: () => refreshPlanner(client),
  })
}

/**
 * Load a course's sections from the registrar.
 *
 * Sections are fetched per course rather than with the planner because the
 * registrar call is slow; the planner returns whatever was cached and this
 * fills in the rest on demand.
 */
export function useLoadSections() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      courseId,
      refresh = false,
    }: {
      courseId: number
      refresh?: boolean
    }) =>
      unwrap(
        api.GET("/planner/courses/{course_id}/sections", {
          params: { path: { course_id: courseId }, query: { refresh } },
        })
      ),
    onSuccess: () => refreshPlanner(client),
  })
}

export function useSelectSections() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      courseId,
      sectionIds,
    }: {
      courseId: number
      sectionIds: number[]
    }) =>
      unwrap(
        api.POST("/planner/courses/{course_id}/sections/select", {
          params: { path: { course_id: courseId } },
          body: { section_ids: sectionIds },
        })
      ),
    onSuccess: () => refreshPlanner(client),
  })
}

/** Ask the server to pick a clash-free combination across all courses. */
export function useAutoBuild() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: () => unwrap(api.POST("/planner/autobuild")),
    onSuccess: () => refreshPlanner(client),
  })
}

export function useResetPlanner() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (term: string | null) =>
      unwrap<void>(api.POST("/planner/reset", { body: { term_value: term } })),
    onSuccess: () => refreshPlanner(client),
  })
}
