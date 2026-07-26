import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type RegisteredCourse = components["schemas"]["RegisteredCourseResponse"]
export type Course = components["schemas"]["BaseCourseSchema"]
/** One graded item within a course: a homework, a midterm, a project. */
export type CourseItem = components["schemas"]["BaseCourseItem"]
export type Schedule = components["schemas"]["ScheduleResponse"]
/** One course section's published grade distribution for a past term. */
export type GradeReport = components["schemas"]["BaseGradeReportSchema"]
export type RegistrarSyncResponse =
  components["schemas"]["RegistrarSyncResponse"]

/**
 * The editable fields of a course item.
 *
 * Create and update take the same shape here even though the API types them
 * separately — the form is identical, and the only real difference is that
 * create needs a course to attach to.
 */
export interface CourseItemDraft {
  item_name: string
  total_weight_pct: number | null
  obtained_score: number | null
  max_score: number | null
}
