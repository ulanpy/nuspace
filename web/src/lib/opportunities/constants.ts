import type { EducationLevel, OpportunityMajor, OpportunityType } from "./types"

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

export const EDUCATION_LEVELS = [
  "UG",
  "GrM",
  "PhD",
] as const satisfies readonly EducationLevel[]

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  UG: "Undergraduate",
  GrM: "Master",
  PhD: "PhD",
}

/**
 * How many study years each level has, and so which year checkboxes to offer.
 * PhD is deliberately empty: the backend models a PhD eligibility as
 * `year: null`, and offering a year would produce a row it cannot store.
 */
export const YEARS_BY_LEVEL: Record<EducationLevel, readonly number[]> = {
  UG: [1, 2, 3, 4],
  GrM: [1, 2],
  PhD: [],
}

export const OPPORTUNITY_MAJORS = [
  "Engineering Management",
  "Mechanical and Aerospace Engineering",
  "Electrical and Computer Engineering",
  "Chemical and Materials Engineering",
  "Civil and Environmental Engineering",
  "Biomedical Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Robotics and Mechatronics Engineering",
  "Computer Science",
  "Data Science",
  "Applied Mathematics",
  "Mathematics",
  "Economics",
  "Business Administration",
  "Finance",
  "Life Sciences",
  "Biological Sciences",
  "Medical Sciences",
  "Molecular Medicine",
  "Pharmacology and Toxicology",
  "Public Health",
  "Sports Medicine and Rehabilitation",
  "Nursing",
  "Doctor of Medicine",
  "A Six-Year Medical Program",
  "Chemistry",
  "Physics",
  "Geosciences",
  "Geology",
  "Political Science and International Relations",
  "Public Policy",
  "Public Administration",
  "Eurasian Studies",
  "Sociology",
  "Anthropology",
  "History",
  "Educational Leadership",
  "Multilingual Education",
  "World Languages, Literature and Culture",
] as const satisfies readonly OpportunityMajor[]

/**
 * `satisfies` proves every listed major is real; this proves none is missing.
 * The list is forty entries copied from a Python enum, and a major the backend
 * added but the form never offers is invisible rather than loud.
 */
type MissingMajor = Exclude<
  OpportunityMajor,
  (typeof OPPORTUNITY_MAJORS)[number]
>
const everyMajorListed: MissingMajor extends never ? true : never = true
void everyMajorListed
