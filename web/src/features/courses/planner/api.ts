import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

import type { PlannerSchedule } from "./types"

/**
 * Which plan a request applies to.
 *
 * Every course-level planner endpoint takes `schedule_id` as an *optional*
 * query parameter, and omitting it means "the student's first plan". That
 * default is what the planner did before it grew variants, so leaving it off
 * still works — but it also means a missing id silently edits the wrong plan
 * once someone has more than one. Callers pass it explicitly.
 */
interface ScheduleScope {
  scheduleId: number | null
}

/** The student's planner: the courses they're considering, with sections. */
export function plannerQueryOptions(scheduleId: number | null) {
  return queryOptions({
    queryKey: qk.courses.planner(scheduleId),
    queryFn: () =>
      unwrap(
        api.GET("/planner", { params: { query: { schedule_id: scheduleId } } })
      ),
  })
}

/** Every plan the student has, with its course count. */
export function plannerPlansQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.plannerPlans(),
    queryFn: () => unwrap(api.GET("/planner/schedules")),
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
 *
 * The plan list goes too: its `course_count` is stale the moment a course is
 * added or removed, and the switcher renders that number.
 */
function refreshPlanner(
  client: QueryClient,
  scheduleId: number | null,
  next?: PlannerSchedule
) {
  if (next) client.setQueryData(qk.courses.planner(scheduleId), next)
  return Promise.all([
    client.invalidateQueries({ queryKey: qk.courses.planner(scheduleId) }),
    client.invalidateQueries({ queryKey: qk.courses.plannerPlans() }),
  ])
}

export function useAddPlannerCourse(scope: ScheduleScope) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: {
      course_code: string
      term_value: string
      term_label?: string | null
      level?: string | null
    }) =>
      unwrap(
        api.POST("/planner/courses", {
          params: { query: { schedule_id: scope.scheduleId } },
          body,
        })
      ),
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

export function useRemovePlannerCourse(scope: ScheduleScope) {
  const client = useQueryClient()

  return useMutation({
    // No `schedule_id`: the course id already belongs to exactly one plan, and
    // the server resolves ownership from it.
    mutationFn: (courseId: number) =>
      unwrap<void>(
        api.DELETE("/planner/courses/{course_id}", {
          params: { path: { course_id: courseId } },
        })
      ),
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

/**
 * Load a course's sections from the registrar.
 *
 * Sections are fetched per course rather than with the planner because the
 * registrar call is slow; the planner returns whatever was cached and this
 * fills in the rest on demand.
 */
export function useLoadSections(scope: ScheduleScope) {
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
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

export function useSelectSections(scope: ScheduleScope) {
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
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

/** Ask the server to pick a clash-free combination across all courses. */
export function useAutoBuild(scope: ScheduleScope) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: () =>
      unwrap(
        api.POST("/planner/autobuild", {
          params: { query: { schedule_id: scope.scheduleId } },
        })
      ),
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

export function useResetPlanner(scope: ScheduleScope) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (term: string | null) =>
      unwrap<void>(
        api.POST("/planner/reset", {
          params: { query: { schedule_id: scope.scheduleId } },
          body: { term_value: term },
        })
      ),
    onSuccess: () => refreshPlanner(client, scope.scheduleId),
  })
}

/**
 * Plan management: create, duplicate, rename, delete.
 *
 * Create, duplicate and delete answer 409 rather than a validation error when
 * they would break an invariant — at most five plans, at least one plan. The
 * body carries `{code, message}`, which `apiErrorMessage` surfaces, so the UI
 * states the actual rule instead of guessing at it.
 */
function refreshPlans(client: QueryClient) {
  return client.invalidateQueries({ queryKey: qk.courses.plannerPlans() })
}

export function useCreatePlan() {
  const client = useQueryClient()

  return useMutation({
    // The server names an unnamed plan for you ("Plan 2", "Plan 3"), which
    // beats making someone think of a name before they have made the plan.
    mutationFn: (name?: string) =>
      unwrap(api.POST("/planner/schedules", { body: { name: name ?? null } })),
    onSuccess: () => refreshPlans(client),
  })
}

export function useDuplicatePlan() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name?: string }) =>
      unwrap(
        api.POST("/planner/schedules/{schedule_id}/duplicate", {
          params: { path: { schedule_id: id } },
          body: { name: name ?? null },
        })
      ),
    onSuccess: () => refreshPlans(client),
  })
}

export function useRenamePlan() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      unwrap(
        api.PATCH("/planner/schedules/{schedule_id}", {
          params: { path: { schedule_id: id } },
          body: { name },
        })
      ),
    onSuccess: async (_plan, { id }) => {
      await refreshPlans(client)
      // The name is on the planner response too, and that is what the switcher
      // reads once a plan is open.
      await client.invalidateQueries({ queryKey: qk.courses.planner(id) })
    },
  })
}

export function useDeletePlan() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      unwrap<void>(
        api.DELETE("/planner/schedules/{schedule_id}", {
          params: { path: { schedule_id: id } },
        })
      ),
    onSuccess: async (_result, id) => {
      await refreshPlans(client)
      // Nothing can read this plan again, and its cached courses would be
      // wrong if the id were ever reused.
      client.removeQueries({ queryKey: qk.courses.planner(id) })
    },
  })
}
