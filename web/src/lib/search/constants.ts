import type { SearchKind } from "./types"

/**
 * The kinds, in chip order, as the backend's `SearchKind` names them. Channel
 * messages (#442) and Profiles (#440) join here when they become kinds.
 */
export const SEARCH_KINDS = [
  "page",
  "course",
  "event",
  "opportunity",
] as const satisfies readonly SearchKind[]

export const KIND_LABELS: Record<SearchKind, string> = {
  page: "Pages",
  course: "Courses",
  event: "Events",
  opportunity: "Opportunities",
}

/** Results per request; the backend's default too. */
export const PAGE_SIZE = 10

/** The front door's suggested terms, and where "I'm Feeling Lucky" goes with no term. */
export const SUGGESTED_TERMS = [
  "dormitory",
  "exchange programs",
  "MATH 251",
  "clubs",
] as const
