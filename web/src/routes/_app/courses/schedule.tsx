import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, RotateCcw, Wand2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { semestersQueryOptions } from "@/features/courses/api"
import {
  plannerPlansQueryOptions,
  plannerQueryOptions,
  useAutoBuild,
  useResetPlanner,
  useRestoreSelections,
} from "@/features/courses/planner/api"
import { CourseSearch } from "@/features/courses/planner/components/course-search"
import { PlanSwitcher } from "@/features/courses/planner/components/plan-switcher"
import { PlannerCourseCard } from "@/features/courses/planner/components/planner-course-card"
import {
  ScheduleAgenda,
  WeeklyGrid,
} from "@/features/courses/planner/components/weekly-grid"
import {
  findClashes,
  formatDays,
  formatRoom,
  timedEvents,
  selectionSnapshot,
} from "@/features/courses/planner/schedule"
import { resolvePlannerLoadState } from "@/features/courses/planner/load-state"
import type { SectionEvent } from "@/features/courses/planner/schedule"
import type { PlannerSchedule } from "@/features/courses/planner/types"
import { useSyllabusLinks } from "@/features/courses/planner/use-syllabus-links"
import { syllabusLink } from "@/features/courses/planner/syllabus"
import {
  EmptyState,
  QueryBoundary,
  QueryError,
  SkeletonLines,
} from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const scheduleSearchSchema = z.object({
  /**
   * The registrar term, e.g. `825`. In the URL so a planned schedule is
   * linkable and survives a reload — the old tab kept it in component state,
   * which meant refreshing quietly dropped you back to the default term.
   */
  term: z.string().optional(),
  /**
   * Which saved plan is open. In the URL for the same reason `term` is: a plan
   * someone has arranged is worth linking to, and a reload otherwise drops
   * them onto whichever plan happens to be first.
   *
   * Coerced, because the router JSON-encodes search values — a hand-written
   * `?plan=3` arrives as a number, and a bare `z.number()` would reject the
   * string form the router itself produces.
   */
  plan: z.coerce.number().optional(),
})

export const Route = createFileRoute("/_app/courses/schedule")({
  validateSearch: scheduleSearchSchema,
  component: ScheduleBuilder,
})

/** Every section the student has actually selected, as calendar events. */
function selectedEvents(planner: PlannerSchedule): SectionEvent[] {
  return planner.courses.flatMap((course) =>
    course.sections
      .filter((section) => section.is_selected)
      .map((section) => ({ course, section }))
  )
}

function PlannerView({
  planner,
  term,
  termLabel,
  scheduleId,
}: {
  planner: PlannerSchedule
  term: string
  termLabel: string
  scheduleId: number | null
}) {
  const [detail, setDetail] = useState<SectionEvent | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const autoBuild = useAutoBuild({ scheduleId })
  const resetPlanner = useResetPlanner({ scheduleId })
  const restoreSelections = useRestoreSelections({ scheduleId })
  const syllabusLinks = useSyllabusLinks()

  const events = selectedEvents(planner)
  const clashes = findClashes(timedEvents(events))
  const addedCodes = new Set(
    planner.courses.map((course) => course.course_code)
  )

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Add courses</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={autoBuild.isPending || planner.courses.length === 0}
              onClick={() => {
                const snapshot = selectionSnapshot(planner)
                autoBuild.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Schedule built", {
                      action: {
                        label: "Undo",
                        onClick: () => {
                          restoreSelections.mutate(snapshot, {
                            onSuccess: () => {
                              toast.success("Previous selections restored")
                            },
                            onError: () => {
                              toast.error(
                                "Undo was incomplete; the latest server state has been reloaded"
                              )
                            },
                          })
                        },
                      },
                    })
                  },
                })
              }}
            >
              {autoBuild.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Wand2 aria-hidden />
              )}
              Auto-build
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={resetPlanner.isPending || planner.courses.length === 0}
              onClick={() => {
                setConfirmingReset(true)
              }}
            >
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </div>
        </div>

        <CourseSearch
          term={term}
          termLabel={termLabel}
          addedCodes={addedCodes}
          scheduleId={scheduleId}
          syllabusLinks={syllabusLinks}
        />
      </Card>

      {autoBuild.data && autoBuild.data.unscheduled_courses.length > 0 && (
        <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
          Could not fit {autoBuild.data.unscheduled_courses.join(", ")} without
          a conflict — pick their sections by hand.
        </p>
      )}

      {clashes.size > 0 && (
        <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm">
          Some selected sections overlap. Conflicting blocks are highlighted
          below.
        </p>
      )}

      {events.length > 0 && (
        <>
          <div className="md:hidden">
            <ScheduleAgenda events={events} onSelect={setDetail} />
          </div>
          <div className="hidden md:block">
            <WeeklyGrid events={events} onSelect={setDetail} />
          </div>
        </>
      )}

      {detail && (
        <Card className="space-y-1 p-4 text-sm">
          <p className="font-semibold">
            {detail.course.course_code} · {detail.section.section_code}
          </p>
          <p className="text-muted-foreground">
            {formatDays(detail.section)} · {detail.section.times}
          </p>
          {formatRoom(detail.section.room) && (
            <p className="text-muted-foreground">
              Room {formatRoom(detail.section.room)}
            </p>
          )}
          {detail.section.faculty && (
            <p className="text-muted-foreground">{detail.section.faculty}</p>
          )}
          {syllabusLink(syllabusLinks, detail.course.course_code) && (
            <Button
              size="sm"
              variant="outline"
              render={
                <a
                  href={syllabusLink(syllabusLinks, detail.course.course_code)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View syllabus
                </a>
              }
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDetail(null)
            }}
          >
            Close
          </Button>
        </Card>
      )}

      <div className="space-y-3">
        {planner.courses.map((course) => (
          <PlannerCourseCard
            key={course.id}
            course={course}
            clashes={clashes}
            scheduleId={scheduleId}
            syllabusLinks={syllabusLinks}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Reset this schedule?"
        description="Every course and section selection in this plan will be removed. This cannot be undone."
        confirmLabel="Reset schedule"
        isPending={resetPlanner.isPending}
        onConfirm={() => {
          resetPlanner.mutate(term, {
            onSuccess: () => {
              setConfirmingReset(false)
            },
          })
        }}
      />
    </div>
  )
}

function ScheduleBuilder() {
  const { term, plan } = Route.useSearch()
  const navigate = Route.useNavigate()

  const semesters = useQuery(semestersQueryOptions())
  const plansQuery = useQuery(plannerPlansQueryOptions())

  const loadState = resolvePlannerLoadState({
    semesters: {
      status: semesters.status,
      data: semesters.data,
      error: semesters.error,
    },
    plans: {
      status: plansQuery.status,
      data: plansQuery.data,
      error: plansQuery.error,
    },
    requestedTerm: term,
    requestedPlan: plan,
  })
  const activePlanId =
    loadState.status === "ready" ? loadState.activePlanId : null

  const plannerQuery = useQuery({
    ...plannerQueryOptions(activePlanId),
    enabled: activePlanId !== null,
  })

  if (loadState.status === "pending") {
    return <SkeletonLines />
  }

  if (loadState.status === "error") {
    const query = loadState.source === "semesters" ? semesters : plansQuery
    return (
      <QueryError
        error={loadState.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  if (loadState.status === "no-terms") {
    return (
      <p className="text-sm text-muted-foreground">
        The registrar has not published any terms to plan against yet.
      </p>
    )
  }

  if (loadState.status === "no-plans") {
    return (
      <EmptyState
        title="Could not load a schedule plan"
        description="The server did not return the default plan it creates for every student."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void plansQuery.refetch()
            }}
          >
            Try again
          </Button>
        }
      />
    )
  }

  const { options, planList, activeTerm, activeLabel } = loadState

  return (
    <div className="space-y-4">
      <PlanSwitcher
        plans={planList.items}
        count={planList.count}
        maxAllowed={planList.max_allowed}
        activeId={activePlanId}
        onSelect={(id) => {
          void navigate({ search: (previous) => ({ ...previous, plan: id }) })
        }}
      />

      <div className="flex items-center gap-2">
        <label htmlFor="term" className="text-sm font-medium">
          Term
        </label>
        <Select
          value={activeTerm}
          onValueChange={(value) => {
            // Base UI reports a cleared select as null; that reads as "no
            // explicit term", which is the default-to-newest case. The plan is
            // preserved: changing term inside a plan is not leaving it.
            void navigate({
              search: (previous) => ({
                ...previous,
                term: value ?? undefined,
              }),
            })
          }}
        >
          <SelectTrigger id="term" className="w-48">
            {/* The value is a registrar id like "825"; without this the
                trigger shows that number instead of "Fall 2026". */}
            <SelectValue>{activeLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <QueryBoundary query={plannerQuery}>
        {(planner) => (
          <PlannerView
            planner={planner}
            term={activeTerm}
            termLabel={activeLabel}
            scheduleId={activePlanId}
          />
        )}
      </QueryBoundary>
    </div>
  )
}
