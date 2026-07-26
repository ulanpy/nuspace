import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type RegisteredCourse = components["schemas"]["RegisteredCourseResponse"]
export type Course = components["schemas"]["BaseCourseSchema"]
/** One graded item within a course: a homework, a midterm, a project. */
export type CourseItem = components["schemas"]["BaseCourseItem"]
export type Schedule = components["schemas"]["ScheduleResponse"]
export type StudentSchedule = components["schemas"]["StudentScheduleResponse"]
export type ScheduleItem = components["schemas"]["UserScheduleItem"]
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

/** Degree audit: what a programme requires and how far along the student is. */
export type AuditCatalog = components["schemas"]["CatalogResponse"]
export type AuditResponse = components["schemas"]["AuditResponse"]
export type AuditProgram = components["schemas"]["AuditProgramResult"]
export type AuditRequirement = components["schemas"]["AuditRequirementResult"]
export type AuditSummary = components["schemas"]["AuditSummary"]
export type DegreeRequirement = components["schemas"]["DegreeRequirement"]
export type TransferCreditMapping = components["schemas"]["TCMapping"]
export type TransferCreditCourse = components["schemas"]["TCCourse"]
export type CourseTemplate = components["schemas"]["TemplateResponse"]
export type TemplateCreate = components["schemas"]["TemplateCreate"]
export type TemplateUpdate = components["schemas"]["TemplateUpdate"]
export type TemplateImport = components["schemas"]["TemplateImportResponse"]
