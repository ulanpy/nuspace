import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/courses/types.ts. */
export type PlannerSchedule = components["schemas"]["PlannerScheduleResponse"]
export type PlannerCourse = components["schemas"]["PlannerCourseResponse"]
export type PlannerSection = components["schemas"]["PlannerSectionResponse"]
export type PlannerSearchResult =
  components["schemas"]["PlannerCourseSearchResult"]
export type SemesterOption = components["schemas"]["SemesterOption"]
export type AutoBuildResult = components["schemas"]["PlannerAutoBuildResponse"]
