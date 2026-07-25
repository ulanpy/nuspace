import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type Opportunity = components["schemas"]["OpportunityResponseDto"]
export type OpportunityType = components["schemas"]["OpportunityType"]
export type OpportunityMajor = components["schemas"]["OpportunityMajor"]
export type EducationLevel = components["schemas"]["EducationLevel"]

export const OPPORTUNITY_TYPES = [
  "research",
  "internship",
  "summer_school",
  "forum",
  "summit",
  "grant",
  "scholarship",
  "conference",
] as const satisfies readonly OpportunityType[]

/** Underscored enum values need a display form. */
export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  research: "Research",
  internship: "Internship",
  summer_school: "Summer school",
  forum: "Forum",
  summit: "Summit",
  grant: "Grant",
  scholarship: "Scholarship",
  conference: "Conference",
}
