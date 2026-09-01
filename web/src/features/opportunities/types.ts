import type { components } from "@/api/schema"

/** Aliases over the generated schema — see features/events/types.ts. */
export type Opportunity = components["schemas"]["OpportunityResponseDto"]
export type OpportunityType = components["schemas"]["OpportunityType"]
export type OpportunityMajor = components["schemas"]["OpportunityMajor"]
export type EducationLevel = components["schemas"]["EducationLevel"]
export type OpportunityCreate = components["schemas"]["OpportunityCreateDto"]
export type OpportunityUpdate = components["schemas"]["OpportunityUpdateDto"]
export type OpportunityEligibility =
  components["schemas"]["OpportunityEligibilityCreateDto"]

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

/**
 * The majors of an opportunity, as plain strings.
 *
 * The response type says `{id, opportunity_id, major}[]`, and the list and
 * detail endpoints do return that — but not every path through the backend
 * rebuilds the association rows, and the old app hit responses carrying bare
 * strings often enough to keep a normaliser. Duplicates are dropped: they
 * arrive when an opportunity is updated with a major it already had, and they
 * previously produced duplicate React keys.
 */
export function normalizeMajors(
  majors: Opportunity["majors"] | readonly string[] | null | undefined
): OpportunityMajor[] {
  if (!Array.isArray(majors)) return []

  const known = new Set<string>(OPPORTUNITY_MAJORS)
  const entries: unknown[] = majors

  const names = entries
    .map((entry) => {
      if (typeof entry === "string") return entry
      if (typeof entry === "object" && entry !== null && "major" in entry) {
        const { major } = entry
        return typeof major === "string" ? major : null
      }
      return null
    })
    // A major the backend knows and this build does not would otherwise be
    // silently re-submitted as an invalid enum value on the next edit.
    .filter((name) => name !== null && known.has(name))

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return [...new Set(names)] as OpportunityMajor[]
}

export function formatEligibilities(
  entries: Opportunity["eligibilities"]
): string[] {
  const grouped = new Map<EducationLevel, number[]>()
  for (const entry of entries ?? []) {
    const years = grouped.get(entry.education_level) ?? []
    if (entry.year !== null) years.push(entry.year)
    grouped.set(entry.education_level, years)
  }

  return [...grouped].map(([level, years]) => {
    const label = EDUCATION_LEVEL_LABELS[level]
    const unique = [...new Set(years)].sort((a, b) => a - b)
    return unique.length === 0 ? label : `${label} · Year ${unique.join(", ")}`
  })
}
