import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ChevronDownIcon,
  ClipboardCopyIcon,
  CropIcon,
  Loader2Icon,
  RotateCcwIcon,
  WandSparklesIcon,
} from "lucide-react"
import { toast } from "sonner"
import type { ReactNode } from "react"

import type { ScheduleSearch } from "@/routes/_app/courses/planner"
import { semestersQueryOptions } from "@/lib/courses"
import {
  plannerPlansQueryOptions,
  plannerQueryOptions,
  useAutoBuild,
  useResetPlanner,
  useRestoreSelections,
} from "@/lib/courses/planner"
import { CourseSearch } from "@/components/routes/courses/planner/components/course-search"
import { PlanSwitcher } from "@/components/routes/courses/planner/components/plan-switcher"
import { PlannerCourseCard } from "@/components/routes/courses/planner/components/planner-course-card"
import { ShortlistCard } from "@/components/routes/courses/planner/components/shortlist-card"
import {
  ScheduleAgenda,
  WeeklyGrid,
} from "@/components/routes/courses/planner/components/weekly-grid"
import {
  findClashes,
  formatScheduleShortlist,
  formatDays,
  formatRoom,
  parseCollapseEmptyEdges,
  timedEvents,
  selectionSnapshot,
} from "@/lib/courses/planner/schedule"
import { resolvePlannerLoadState } from "@/lib/courses/planner"
import type { SectionEvent } from "@/lib/courses/planner/schedule"
import type { PlannerSchedule } from "@/lib/courses/planner"
import { useSyllabusLinks } from "@/hooks/use-syllabus-links"
import { syllabusLink } from "@/lib/courses/planner"
import {
  EmptyState,
  QueryError,
  SkeletonLines,
} from "@/components/shared/query/boundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"

/** Every section the student has actually selected, as calendar events. */
function selectedEvents(planner: PlannerSchedule): SectionEvent[] {
  return planner.courses.flatMap((course) =>
    course.sections
      .filter((section) => section.is_selected)
      .map((section) => ({ course, section }))
  )
}

/**
 * The screen's two columns: a 18rem rail of finding and shortlisting courses
 * beside the schedule at `xl`, stacked above it below.
 */
function PlannerLayout({
  aside,
  children,
}: {
  aside: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
      <aside className="w-full min-w-0 shrink-0 space-y-4 xl:w-72">
        {aside}
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  )
}

function PanelCard({ children }: { children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
      {children}
    </section>
  )
}

function PlannerView({
  planner,
  term,
  termLabel,
  scheduleId,
  requestedCourseId,
  onCourseSelect,
  termSelect,
  planSwitcher,
}: {
  planner: PlannerSchedule
  term: string
  termLabel: string
  scheduleId: number | null
  requestedCourseId: number | undefined
  onCourseSelect: (id: number) => void
  termSelect: ReactNode
  planSwitcher: ReactNode
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

  const [previousScheduleId, setPreviousScheduleId] = useState(scheduleId)
  const detailCourse = planner.courses.find(
    (course) => course.id === detail?.course.id
  )
  const detailSection = detailCourse?.sections.find(
    (section) => section.id === detail?.section.id
  )
  if (previousScheduleId !== scheduleId) {
    setPreviousScheduleId(scheduleId)
    setDetail(null)
  } else if (detail && !detailSection?.is_selected) {
    setDetail(null)
  }

  const changeCrop = (next: boolean) => {
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

  const runAutoBuild = () => {
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
  }

  const noCourses = planner.courses.length === 0

  return (
    <PlannerLayout
      aside={
        <>
          <PanelCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Find a course</h2>
              {termSelect}
            </div>
            <CourseSearch
              term={term}
              termLabel={termLabel}
              addedCodes={addedCodes}
              scheduleId={scheduleId}
              syllabusLinks={syllabusLinks}
            />
          </PanelCard>

          <section className="max-h-[500px] overflow-x-hidden overflow-y-auto rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Courses</h2>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="outline" size="sm" className="gap-1.5">
                      Actions
                      <ChevronDownIcon className="opacity-70" aria-hidden />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Course actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    className="items-start py-2"
                    disabled={autoBuild.isPending || noCourses}
                    onClick={runAutoBuild}
                  >
                    {autoBuild.isPending ? (
                      <Loader2Icon className="animate-spin" aria-hidden />
                    ) : (
                      <WandSparklesIcon aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="leading-none font-medium">Auto-build</p>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Pick a conflict-free set of sections.
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="items-start py-2"
                    variant="destructive"
                    disabled={resetPlanner.isPending || noCourses}
                    onClick={() => {
                      setConfirmingReset(true)
                    }}
                  >
                    <RotateCcwIcon aria-hidden />
                    <div className="min-w-0">
                      <p className="leading-none font-medium">Reset plan</p>
                      <p className="mt-1 text-xs font-normal text-muted-foreground">
                        Remove every course and section in this plan.
                      </p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-3 space-y-2">
              {noCourses && (
                <p className="text-sm text-muted-foreground">
                  Search above and add a course to start planning.
                </p>
              )}
              {planner.courses.map((course) => (
                <ShortlistCard
                  key={course.id}
                  course={course}
                  isActive={activeCourse?.id === course.id}
                  scheduleId={scheduleId}
                  syllabus={syllabusLink(syllabusLinks, course.course_code)}
                  onSelect={() => {
                    onCourseSelect(course.id)
                  }}
                />
              ))}
            </div>
          </section>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {planSwitcher}

            {events.length > 0 && (
              <Badge
                variant={clashes.size > 0 ? "destructive" : "secondary"}
                className="h-6 px-1.5 text-[11px] font-semibold"
              >
                {clashes.size > 0 ? "Conflicts" : "No conflicts"}
              </Badge>
            )}

            <div className="flex items-center gap-1.5">
              <Switch
                id="collapse-empty-edges"
                size="sm"
                checked={collapseEmptyEdges}
                onCheckedChange={changeCrop}
              />
              <Label
                htmlFor="collapse-empty-edges"
                className="cursor-pointer text-xs font-normal text-muted-foreground"
              >
                <CropIcon
                  className="size-3.5 shrink-0 opacity-70"
                  aria-hidden
                />
                Crop
              </Label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {events.length} selected{" "}
              {events.length === 1 ? "section" : "sections"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 gap-1 px-2 font-medium text-muted-foreground hover:text-foreground"
              disabled={events.length === 0}
              onClick={() => {
                void copyShortlist()
              }}
            >
              <ClipboardCopyIcon aria-hidden />
              Copy
            </Button>
          </div>
        </div>

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
                nativeButton={false}
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
    </PlannerLayout>
  )
}

export function ScheduleBuilderScreen({
  search,
  onSearchChange,
}: {
  search: ScheduleSearch
  onSearchChange: (
    updater: (previous: ScheduleSearch) => ScheduleSearch
  ) => void
}) {
  const { term, plan, course } = search

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

  const termSelect = (
    <Select
      value={activeTerm}
      onValueChange={(value) => {
        // Base UI reports a cleared select as null; that reads as "no
        // explicit term", the default-to-newest case. Keep the plan:
        // changing term is not leaving it.
        onSearchChange((previous) => ({
          ...previous,
          term: value ?? undefined,
        }))
      }}
    >
      <SelectTrigger size="sm" aria-label="Term" className="w-auto">
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
  )

  const planSwitcher = (
    <PlanSwitcher
      plans={planList.items}
      count={planList.count}
      maxAllowed={planList.max_allowed}
      activeId={activePlanId}
      onSelect={(id) => {
        onSearchChange((previous) => ({ ...previous, plan: id }))
      }}
    />
  )

  if (plannerQuery.isPending || plannerQuery.isError) {
    return (
      <PlannerLayout
        aside={
          <PanelCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Find a course</h2>
              {termSelect}
            </div>
          </PanelCard>
        }
      >
        <div className="space-y-4">
          {planSwitcher}
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
      </PlannerLayout>
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
        onSearchChange((previous) => ({ ...previous, course: id }))
      }}
      termSelect={termSelect}
      planSwitcher={planSwitcher}
    />
  )
}
