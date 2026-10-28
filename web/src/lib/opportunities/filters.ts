import type { OpportunityFilters } from "./functions"
import type { EducationLevel, OpportunityMajor, OpportunityType } from "./types"

/**
 * The digest's filter state as the URL holds it (`routes/_app/opportunities`).
 * An absent list means "no filter on this". The list endpoint reads the same
 * five filters under different names, so this module is the one place the two
 * spellings meet.
 */
export interface OpportunitiesSearchState {
  type?: OpportunityType[]
  education?: EducationLevel[]
  years?: number[]
  majors?: OpportunityMajor[]
  q?: string
  hideExpired: boolean
}

/** Expired opportunities are hidden until the reader asks for them. */
export const DEFAULT_HIDE_EXPIRED = true

function nonEmpty<T>(values: readonly T[] | undefined): T[] | undefined {
  return values && values.length > 0 ? [...values] : undefined
}

/**
 * What `GET /opportunities` is called with. Empty lists and a blank query are
 * left out, so "nothing selected" and "no filter" cannot be two different
 * query keys.
 */
export function toApiFilters(
  search: OpportunitiesSearchState
): OpportunityFilters {
  return {
    type: nonEmpty(search.type),
    majors: nonEmpty(search.majors),
    education_level: nonEmpty(search.education),
    years: nonEmpty(search.years),
    q: search.q?.trim() || undefined,
    hide_expired: search.hideExpired,
  }
}

/**
 * How many things narrow the list: every selected value, plus the toggle when
 * it has been moved off its default. The search box is not a filter; it has
 * its own field and survives "Clear".
 */
export function activeFilterCount(search: OpportunitiesSearchState): number {
  return (
    (search.type?.length ?? 0) +
    (search.education?.length ?? 0) +
    (search.years?.length ?? 0) +
    (search.majors?.length ?? 0) +
    (search.hideExpired === DEFAULT_HIDE_EXPIRED ? 0 : 1)
  )
}

/** "Clear": every filter and the toggle back to default; the query stays. */
export function clearFilters(
  search: OpportunitiesSearchState
): OpportunitiesSearchState {
  return {
    type: undefined,
    education: undefined,
    years: undefined,
    majors: undefined,
    q: search.q,
    hideExpired: DEFAULT_HIDE_EXPIRED,
  }
}

/** A multi-select's next value for the URL: an empty one is dropped. */
export function toSelection<T>(values: readonly T[]): T[] | undefined {
  return nonEmpty(values)
}

/** The year options are strings (checkbox values); the URL holds numbers. */
export function yearsToValues(years: readonly number[] | undefined): string[] {
  return (years ?? []).map(String)
}

export function valuesToYears(values: readonly string[]): number[] | undefined {
  return nonEmpty(values.map(Number))
}
