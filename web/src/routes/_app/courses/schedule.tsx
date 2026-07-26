import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, RotateCcw, Wand2 } from "lucide-react"
import { z } from "zod"

import { semestersQueryOptions } from "@/features/courses/api"
import {
  plannerQueryOptions,
  useAutoBuild,
  useResetPlanner,
} from "@/features/courses/planner/api"
import { CourseSearch } from "@/features/courses/planner/components/course-search"
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
} from "@/features/courses/planner/schedule"
import type { SectionEvent } from "@/features/courses/planner/schedule"
import type { PlannerSchedule } from "@/features/courses/planner/types"
import { QueryBoundary } from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
}: {
  planner: PlannerSchedule
  term: string
  termLabel: string
}) {
  const [detail, setDetail] = useState<SectionEvent | null>(null)
  const autoBuild = useAutoBuild()
  const resetPlanner = useResetPlanner()

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
                autoBuild.mutate()
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
                resetPlanner.mutate(term)
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
          />
        ))}
      </div>
    </div>
  )
}

function ScheduleBuilder() {
  const { term } = Route.useSearch()
  const navigate = Route.useNavigate()

  const semesters = useQuery(semestersQueryOptions())
  const plannerQuery = useQuery(plannerQueryOptions())

  const options = semesters.data ?? []
  // The newest term the registrar offers, used when the URL names none — or
  // names one that no longer exists. A hardcoded id would search an empty
  // catalog once terms rolled over, and a shared link outlives its term, so
  // both cases have to land somewhere real rather than on "no results".
  const activeTerm =
    options.find((option) => option.value === term)?.value ?? options[0]?.value
  const activeLabel =
    options.find((option) => option.value === activeTerm)?.label ?? "this term"

  if (semesters.isPending) {
    return <p className="text-sm text-muted-foreground">Loading terms…</p>
  }

  if (!activeTerm) {
    return (
      <p className="text-sm text-muted-foreground">
        The registrar has not published any terms to plan against yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="term" className="text-sm font-medium">
          Term
        </label>
        <Select
          value={activeTerm}
          onValueChange={(value) => {
            // Base UI reports a cleared select as null; that reads as "no
            // explicit term", which is the default-to-newest case.
            void navigate({ search: { term: value ?? undefined } })
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
          />
        )}
      </QueryBoundary>
    </div>
  )
}
