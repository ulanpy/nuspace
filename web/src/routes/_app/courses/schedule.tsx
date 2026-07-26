import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ClipboardCopy,
  CropIcon,
  Loader2,
  RotateCcw,
  Wand2,
} from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import type { ReactNode } from "react"

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
  formatScheduleShortlist,
  formatDays,
  formatRoom,
  parseCollapseEmptyEdges,
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
  QueryError,
  SkeletonLines,
} from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { cn } from "@/lib/utils"
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
  /** The planner course whose section controls are open. */
  course: z.coerce.number().optional(),
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
  requestedCourseId,
  onCourseSelect,
  management,
}: {
  planner: PlannerSchedule
  term: string
  termLabel: string
  scheduleId: number | null
  requestedCourseId: number | undefined
  onCourseSelect: (id: number) => void
  management: ReactNode
}) {
  const [detail, setDetail] = useState<SectionEvent | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [collapseEmptyEdges, setCollapseEmptyEdges] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return parseCollapseEmptyEdges(
        window.localStorage.getItem("planner.collapseEmptyEdges")
      )
    } catch {
      return false
    }
  })
  const autoBuild = useAutoBuild({ scheduleId })
  const resetPlanner = useResetPlanner({ scheduleId })
  const restoreSelections = useRestoreSelections({ scheduleId })
  const syllabusLinks = useSyllabusLinks()

  const events = selectedEvents(planner)
  const clashes = findClashes(timedEvents(events))
  const addedCodes = new Set(
    planner.courses.map((course) => course.course_code)
  )
  const activeCourse =
    planner.courses.find((course) => course.id === requestedCourseId) ??
    planner.courses[0] ??
    null

  useEffect(() => {
    setDetail(null)
  }, [scheduleId])

  useEffect(() => {
    if (!detail) return
    const currentCourse = planner.courses.find(
      (course) => course.id === detail.course.id
    )
    const currentSection = currentCourse?.sections.find(
      (section) => section.id === detail.section.id
    )
    if (!currentSection?.is_selected) setDetail(null)
  }, [detail, planner.courses])

  const changeCrop = () => {
    const next = !collapseEmptyEdges
    setCollapseEmptyEdges(next)
    try {
      window.localStorage.setItem(
        "planner.collapseEmptyEdges",
        next ? "1" : "0"
      )
    } catch {
      // Private browsing and disabled storage should not block the planner.
    }
  }

  const copyShortlist = async () => {
    const text = formatScheduleShortlist(planner)
    if (!text) {
      toast.error("Select at least one section before copying")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Schedule copied as text")
    } catch {
      toast.error("Could not access the clipboard")
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,2fr)]">
      <div className="space-y-4">
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold">Plan and term</h2>
          {management}
        </Card>

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
                disabled={
                  resetPlanner.isPending || planner.courses.length === 0
                }
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

        {planner.courses.length > 0 && (
          <Card className="space-y-2 p-3">
            <h2 className="px-1 text-sm font-semibold">Planned courses</h2>
            {planner.courses.map((course) => (
              <button
                key={course.id}
                type="button"
                aria-current={
                  activeCourse?.id === course.id ? "true" : undefined
                }
                onClick={() => {
                  onCourseSelect(course.id)
                }}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-left transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  activeCourse?.id === course.id
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted/60"
                )}
              >
                <span className="block text-sm font-semibold">
                  {course.course_code}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {course.title || "Untitled course"} ·{" "}
                  {course.sections.filter((section) => section.is_selected)
                    .length || "no"}{" "}
                  selected
                </span>
              </button>
            ))}
          </Card>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {autoBuild.data && autoBuild.data.unscheduled_courses.length > 0 && (
          <p className="rounded-lg border border-warning bg-warning/10 p-3 text-sm">
            Could not fit {autoBuild.data.unscheduled_courses.join(", ")}{" "}
            without a conflict — pick their sections by hand.
          </p>
        )}

        {clashes.size > 0 && (
          <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm">
            Some selected sections overlap. Conflicting blocks are highlighted
            below.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Schedule preview</h2>
            <p className="text-xs text-muted-foreground">
              {events.length} selected{" "}
              {events.length === 1 ? "section" : "sections"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={collapseEmptyEdges ? "secondary" : "outline"}
              aria-pressed={collapseEmptyEdges}
              onClick={changeCrop}
            >
              <CropIcon aria-hidden />
              Crop empty edges
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={events.length === 0}
              onClick={() => {
                void copyShortlist()
              }}
            >
              <ClipboardCopy aria-hidden />
              Copy as text
            </Button>
          </div>
        </div>

        {events.length > 0 && (
          <>
            <div className="md:hidden">
              <ScheduleAgenda
                events={events}
                onSelect={setDetail}
                collapseEmptyEdges={collapseEmptyEdges}
              />
            </div>
            <div className="hidden md:block">
              <WeeklyGrid
                events={events}
                onSelect={setDetail}
                collapseEmptyEdges={collapseEmptyEdges}
              />
            </div>
          </>
        )}
        {events.length === 0 && (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            Select sections below to populate the schedule preview.
          </Card>
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
                    href={syllabusLink(
                      syllabusLinks,
                      detail.course.course_code
                    )}
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

        {activeCourse && (
          <PlannerCourseCard
            key={activeCourse.id}
            course={activeCourse}
            clashes={clashes}
            scheduleId={scheduleId}
            syllabusLinks={syllabusLinks}
          />
        )}
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
  const { term, plan, course } = Route.useSearch()
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
  const management = (
    <>
      <PlanSwitcher
        plans={planList.items}
        count={planList.count}
        maxAllowed={planList.max_allowed}
        activeId={activePlanId}
        onSelect={(id) => {
          void navigate({
            search: (previous) => ({ ...previous, plan: id }),
          })
        }}
      />

      <div className="space-y-1">
        <label htmlFor="term" className="text-sm font-medium">
          Term
        </label>
        <Select
          value={activeTerm}
          onValueChange={(value) => {
            // Base UI reports a cleared select as null; that reads as "no
            // explicit term", the default-to-newest case. Keep the plan:
            // changing term is not leaving it.
            void navigate({
              search: (previous) => ({
                ...previous,
                term: value ?? undefined,
              }),
            })
          }}
        >
          <SelectTrigger id="term" className="w-full">
            {/* Without this, the trigger shows registrar id "825" instead of
                a useful term label such as "Fall 2026". */}
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
    </>
  )

  if (plannerQuery.isPending || plannerQuery.isError) {
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(17rem,0.85fr)_minmax(0,2fr)]">
        <Card className="space-y-4 p-4">
          <h2 className="font-semibold">Plan and term</h2>
          {management}
        </Card>
        {plannerQuery.isPending ? (
          <SkeletonLines />
        ) : (
          <QueryError
            error={plannerQuery.error}
            onRetry={() => {
              void plannerQuery.refetch()
            }}
          />
        )}
      </div>
    )
  }

  return (
    <PlannerView
      planner={plannerQuery.data}
      term={activeTerm}
      termLabel={activeLabel}
      scheduleId={activePlanId}
      requestedCourseId={course}
      onCourseSelect={(id) => {
        void navigate({
          search: (previous) => ({ ...previous, course: id }),
        })
      }}
      management={management}
    />
  )
}
