import type {
  PlannerPlanList,
  SemesterOption,
} from "@/features/courses/planner/types"

type QueryStatus = "pending" | "error" | "success"

export interface Loadable<T> {
  status: QueryStatus
  data?: T
  error?: unknown
}

export type PlannerLoadState =
  | { status: "pending" }
  | { status: "error"; source: "semesters" | "plans"; error: unknown }
  | { status: "no-terms" }
  | { status: "no-plans" }
  | {
      status: "ready"
      options: SemesterOption[]
      planList: PlannerPlanList
      activePlanId: number
      activeTerm: string
      activeLabel: string
    }

interface PlannerLoadInput {
  semesters: Loadable<SemesterOption[]>
  plans: Loadable<PlannerPlanList>
  requestedTerm?: string
  requestedPlan?: number
}

/**
 * Resolve the two prerequisite queries before the plan query is rendered.
 *
 * Keeping this independent of React makes every pending/error/empty transition
 * testable with the repository's Node-only test runner.
 */
export function resolvePlannerLoadState({
  semesters,
  plans,
  requestedTerm,
  requestedPlan,
}: PlannerLoadInput): PlannerLoadState {
  if (semesters.status === "error") {
    return { status: "error", source: "semesters", error: semesters.error }
  }
  if (plans.status === "error") {
    return { status: "error", source: "plans", error: plans.error }
  }
  if (semesters.status === "pending" || plans.status === "pending") {
    return { status: "pending" }
  }

  const options = semesters.data ?? []
  if (options.length === 0) return { status: "no-terms" }

  const planList = plans.data
  if (!planList || planList.items.length === 0) {
    return { status: "no-plans" }
  }

  const activePlanId =
    planList.items.find((entry) => entry.id === requestedPlan)?.id ??
    planList.items[0].id
  const activeTerm =
    options.find((option) => option.value === requestedTerm)?.value ??
    options[0].value
  const activeLabel =
    options.find((option) => option.value === activeTerm)?.label ?? "this term"

  return {
    status: "ready",
    options,
    planList,
    activePlanId,
    activeTerm,
    activeLabel,
  }
}
