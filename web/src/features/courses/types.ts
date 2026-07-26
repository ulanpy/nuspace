import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type RegisteredCourse = components["schemas"]["RegisteredCourseResponse"]
export type Course = components["schemas"]["BaseCourseSchema"]
/** One graded item within a course: a homework, a midterm, a project. */
export type CourseItem = components["schemas"]["BaseCourseItem"]
export type Schedule = components["schemas"]["ScheduleResponse"]
export type RegistrarSyncResponse =
  components["schemas"]["RegistrarSyncResponse"]
