import type { components } from "@/api/schema"

export type Opportunity = components["schemas"]["OpportunityResponseDto"]
export type OpportunityType = components["schemas"]["OpportunityType"]
export type OpportunityMajor = components["schemas"]["OpportunityMajor"]
export type EducationLevel = components["schemas"]["EducationLevel"]
export type OpportunityCreate = components["schemas"]["OpportunityCreateDto"]
export type OpportunityUpdate = components["schemas"]["OpportunityUpdateDto"]
export type OpportunityEligibility =
  components["schemas"]["OpportunityEligibilityCreateDto"]
