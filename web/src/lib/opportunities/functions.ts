import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type {
  EducationLevel,
  Opportunity,
  OpportunityMajor,
  OpportunityCreate,
  OpportunityType,
  OpportunityUpdate,
} from "@/lib/opportunities/types"
import { EDUCATION_LEVEL_LABELS, OPPORTUNITY_MAJORS } from "./constants"
import { CAMPUS_TIME_ZONE } from "@/lib/utils"

export interface OpportunityFilters {
  type?: OpportunityType[]
  majors?: OpportunityMajor[]
  education_level?: EducationLevel[]
  years?: number[]
  q?: string
  hide_expired?: boolean
}

export function useAddOpportunityToCalendar() {
  return useMutation({
    mutationFn: (id: number) =>
      unwrap(
        api.POST("/opportunities/{id}/calendar", {
          params: { path: { id } },
        })
      ),
  })
}

/** One page of the opportunities digest. Used by useInfiniteList. */
export function fetchOpportunitiesPage(
  filters: OpportunityFilters,
  { page, size }: { page: number; size: number }
) {
  return unwrap(
    api.GET("/opportunities", {
      params: { query: { page, size, ...filters } },
    })
  )
}

/**
 * Every mutation invalidates the whole `opportunities` key rather than the one
 * list it came from. The digest is filtered and paginated, an edit can move a
 * record between pages or out of the active filter entirely, and the list is
 * small enough that a refetch costs nothing worth optimising.
 */
export function useCreateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: OpportunityCreate) =>
      unwrap(api.POST("/opportunities", { body })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: OpportunityUpdate }) =>
      unwrap(
        api.PATCH("/opportunities/{id}", { params: { path: { id } }, body })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      unwrap(api.DELETE("/opportunities/{id}", { params: { path: { id } } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.opportunities.all() })
    },
  })
}

export type DeadlineKind = "year-round" | "open" | "closing-soon" | "closed"

export interface DeadlinePresentation {
  kind: DeadlineKind
  label: string
  relative: string | null
}

const DAY = 24 * 60 * 60 * 1000
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

function roundedDays(milliseconds: number): number {
  return Math.max(1, Math.ceil(Math.abs(milliseconds) / DAY))
}

function campusDateOrdinal(now: number): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMPUS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now))
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  return Date.UTC(value("year"), value("month") - 1, value("day"))
}

function dateOnlyPresentation(
  match: RegExpExecArray,
  now: number
): DeadlinePresentation {
  const deadlineOrdinal = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  )
  const days = Math.round((deadlineOrdinal - campusDateOrdinal(now)) / DAY)

  if (days < 0) {
    const elapsed = Math.abs(days)
    return {
      kind: "closed",
      label: "Closed",
      relative: `Closed ${String(elapsed)} ${
        elapsed === 1 ? "day" : "days"
      } ago`,
    }
  }

  return {
    kind: days <= 7 ? "closing-soon" : "open",
    label: days <= 7 ? "Closing soon" : "Open",
    relative:
      days === 0
        ? "Closes today"
        : `Closes in ${String(days)} ${days === 1 ? "day" : "days"}`,
  }
}

export function getDeadlinePresentation(
  deadline: string | null | undefined,
  now = Date.now()
): DeadlinePresentation {
  if (!deadline) {
    return { kind: "year-round", label: "Year-round", relative: null }
  }

  const dateOnly = DATE_ONLY.exec(deadline)
  if (dateOnly) return dateOnlyPresentation(dateOnly, now)

  const deadlineTime = new Date(deadline).getTime()
  if (Number.isNaN(deadlineTime)) {
    return { kind: "year-round", label: "Year-round", relative: null }
  }

  const remaining = deadlineTime - now
  if (remaining < 0) {
    const days = roundedDays(remaining)
    return {
      kind: "closed",
      label: "Closed",
      relative: `Closed ${String(days)} ${days === 1 ? "day" : "days"} ago`,
    }
  }

  const days = roundedDays(remaining)
  return {
    kind: remaining <= 7 * DAY ? "closing-soon" : "open",
    label: remaining <= 7 * DAY ? "Closing soon" : "Open",
    relative: `Closes in ${String(days)} ${days === 1 ? "day" : "days"}`,
  }
}

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
