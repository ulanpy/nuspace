import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

import type { CourseItemDraft } from "./types"

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

/**
 * Every item mutation invalidates the whole registered-courses query.
 *
 * Items only ever appear nested inside a course, and editing one changes the
 * course score, the semester GPA and the projection all at once — there is no
 * smaller unit worth patching by hand.
 */
function refreshCourses(client: QueryClient) {
  return client.invalidateQueries({ queryKey: qk.courses.registered() })
}

export function useAddCourseItem() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (body: CourseItemDraft & { student_course_id: number }) =>
      unwrap(api.POST("/course_items", { body })),
    onSuccess: () => refreshCourses(client),
  })
}

export function useUpdateCourseItem() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ itemId, ...body }: CourseItemDraft & { itemId: number }) =>
      unwrap(
        api.PATCH("/course_items/{item_id}", {
          params: { path: { item_id: itemId } },
          body,
        })
      ),
    onSuccess: () => refreshCourses(client),
  })
}

export function useDeleteCourseItem() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (itemId: number) =>
      unwrap<void>(
        api.DELETE("/course_items/{item_id}", {
          params: { path: { item_id: itemId } },
        })
      ),
    onSuccess: () => refreshCourses(client),
  })
}

/** Terms that have published grade statistics, newest first. */
export function gradeTermsQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.gradeTerms(),
    queryFn: () => unwrap(api.GET("/grades/terms")),
    staleTime: Infinity,
  })
}

/**
 * One page of grade statistics.
 *
 * `keyword` goes to Meilisearch and `term` narrows in SQL; either may be
 * omitted. Kept as a plain fetcher rather than queryOptions because the
 * statistics list paginates through `useInfiniteList`.
 */
export function fetchGradesPage(params: {
  page: number
  size: number
  keyword?: string
  term?: string
}) {
  return unwrap(
    api.GET("/grades", {
      params: {
        query: {
          page: params.page,
          size: params.size,
          keyword: params.keyword ?? null,
          term: params.term ?? null,
        },
      },
    })
  )
}
