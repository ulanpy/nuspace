import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/courses/types.ts. */
export type PlannerSchedule = components["schemas"]["PlannerScheduleResponse"]
/** One plan in the switcher: name and course count, without the courses. */
export type PlannerPlan = components["schemas"]["PlannerScheduleSummary"]
export type PlannerPlanList =
  components["schemas"]["PlannerScheduleListResponse"]
export type PlannerCourse = components["schemas"]["PlannerCourseResponse"]
export type PlannerSection = components["schemas"]["PlannerSectionResponse"]
export type PlannerSearchResult =
  components["schemas"]["PlannerCourseSearchResult"]
export type SemesterOption = components["schemas"]["SemesterOption"]
export type AutoBuildResult = components["schemas"]["PlannerAutoBuildResponse"]
