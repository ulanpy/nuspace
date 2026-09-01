import {
  queryOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"

import type {
  CourseItemDraft,
  RegisteredCourse,
  TemplateUpdate,
  TransferCreditMapping,
} from "./types"
import { templateItemsFromCourse } from "./templates"

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

export function useGoogleScheduleExport() {
  return useMutation({
    mutationFn: () => unwrap(api.POST("/registered_courses/schedule/google")),
  })
}

export async function downloadScheduleIcs(): Promise<void> {
  const text = await unwrap(
    api.GET("/registered_courses/schedule/ics", { parseAs: "text" })
  )
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/calendar;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = "schedule.ics"
  link.click()
  URL.revokeObjectURL(url)
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
          // dev's /grades takes one or more term codes as a repeatable param,
          // typed as an array; the page picks a single term, so send a 1-item list.
          term: params.term ? [params.term] : null,
        },
      },
    })
  )
}

export function templatesQueryOptions(courseId: number, page = 1, size = 20) {
  return queryOptions({
    queryKey: [...qk.courses.templates(courseId), page, size] as const,
    queryFn: () =>
      unwrap(
        api.GET("/templates", {
          params: { query: { course_id: courseId, page, size } },
        })
      ),
  })
}

export function useShareCourseTemplate() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      course,
      studentSub,
    }: {
      course: RegisteredCourse
      studentSub: string
    }) => {
      const items = templateItemsFromCourse(course)
      const listed = await unwrap(
        api.GET("/templates", {
          params: {
            query: { course_id: course.course.id, page: 1, size: 100 },
          },
        })
      )
      const mine = listed.templates.find(
        (entry) => entry.template.student_sub === studentSub
      )

      if (mine) {
        const body: TemplateUpdate = {
          template_items: items.map((item) => ({
            item_name: item?.item_name ?? "",
            total_weight_pct: item?.total_weight_pct ?? 0,
          })),
        }
        return unwrap(
          api.PATCH("/templates/{template_id}", {
            params: { path: { template_id: mine.template.id } },
            body,
          })
        )
      }

      return unwrap(
        api.POST("/templates", {
          body: {
            course_id: course.course.id,
            student_sub: "me",
            template_items: items,
          },
        })
      )
    },
    onSuccess: async (_result, { course }) => {
      await client.invalidateQueries({
        queryKey: qk.courses.templates(course.course.id),
      })
    },
  })
}

export function useImportCourseTemplate() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({
      templateId,
      studentCourseId,
    }: {
      templateId: number
      studentCourseId: number
    }) =>
      unwrap(
        api.POST("/templates/{template_id}/import", {
          params: {
            path: { template_id: templateId },
            query: { student_course_id: studentCourseId },
          },
        })
      ),
    onSuccess: () => refreshCourses(client),
  })
}

/**
 * Sync registered courses straight from the registrar.
 *
 * The password is sent for this one request and nothing else: it is used to log
 * in to the registrar and is never stored, logged or cached server-side. It
 * must never be persisted client-side either — no localStorage, no form
 * autofill of a saved value, no retry that replays it later.
 */
export function useRegistrarSync() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (password: string) =>
      unwrap(api.POST("/registered_courses/sync", { body: { password } })),
    onSuccess: () => refreshCourses(client),
  })
}

/**
 * Sync from a personal-schedule PDF the student downloads themselves.
 *
 * The alternative for anyone unwilling to type their registrar password into
 * something that isn't the registrar — a reasonable instinct, and one worth
 * accommodating even though the password never leaves the request.
 */
export function useRegistrarPdfSync() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) =>
      unwrap(
        api.POST("/registered_courses/sync/pdf", {
          body: { pdf_file: await toBase64(file) },
        })
      ),
    onSuccess: () => refreshCourses(client),
  })
}

/** The API wants the PDF base64-encoded, without the data-URL prefix. */
async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let binary = ""
  // Chunked because String.fromCharCode(...bytes) blows the argument limit on
  // a file of any real size.
  const CHUNK = 0x8000
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK))
  }

  return btoa(binary)
}

/** Admission years, majors and minors the audit can run against. */
export function auditCatalogQueryOptions() {
  return queryOptions({
    queryKey: qk.courses.degreeAudit(),
    queryFn: () => unwrap(api.GET("/degree-audit/catalog")),
    // Requirement CSVs ship with the backend; they change once a year at most.
    staleTime: Infinity,
  })
}

/**
 * The last audit this student ran, if any.
 *
 * An audit is expensive — it pulls a transcript from the registrar — so the
 * result is cached server-side and shown on arrival rather than making the
 * student re-enter their password to see what they already computed.
 */
export function cachedAuditQueryOptions(year?: string, major?: string) {
  return queryOptions({
    queryKey: [...qk.courses.degreeAudit(), "result", year, major] as const,
    queryFn: () =>
      unwrap(
        api.GET("/degree-audit/result", {
          params: { query: { year: year ?? null, major: major ?? null } },
        })
      ),
  })
}

export function degreeRequirementsQueryOptions(
  year: string,
  name: string,
  type: string
) {
  return queryOptions({
    queryKey: qk.courses.requirements(year, name, type),
    queryFn: () =>
      unwrap(
        api.GET("/degree-audit/requirements", {
          params: { query: { year, name, type } },
        })
      ),
    enabled: year.length > 0 && name.length > 0,
    staleTime: Infinity,
  })
}

export interface AuditSelection {
  year: string
  majors: string[]
  minors: string[]
}

export function useRegistrarAudit() {
  const client = useQueryClient()

  return useMutation({
    // The variables contain a registrar password. Remove the mutation from the
    // cache as soon as its observer goes away instead of retaining it for the
    // default mutation GC window.
    gcTime: 0,
    mutationFn: ({
      password,
      tcMappings = [],
      ...selection
    }: AuditSelection & {
      password: string
      tcMappings?: TransferCreditMapping[]
    }) =>
      unwrap(
        api.POST("/degree-audit/audit/registrar", {
          // `username` is required by the schema but the backend derives it;
          // sending the empty string keeps the contract without inventing one.
          body: {
            ...selection,
            username: "",
            password,
            tc_mappings: tcMappings,
          },
        })
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: qk.courses.degreeAudit() }),
  })
}

export function useTranscriptAudit() {
  const client = useQueryClient()

  return useMutation({
    // The PDF is sensitive transcript data and must not outlive this route.
    gcTime: 0,
    mutationFn: async ({
      file,
      tcMappings = [],
      ...selection
    }: AuditSelection & {
      file: File
      tcMappings?: TransferCreditMapping[]
    }) =>
      unwrap(
        api.POST("/degree-audit/audit/pdf", {
          body: {
            ...selection,
            pdf_file: await toBase64(file),
            tc_mappings: tcMappings,
          },
        })
      ),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: qk.courses.degreeAudit() }),
  })
}
