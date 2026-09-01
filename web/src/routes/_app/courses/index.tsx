import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { BookOpenIcon, CalendarDaysIcon, RefreshCcw } from "lucide-react"
import { z } from "zod"

import { registeredCoursesQueryOptions } from "@/features/courses/api"
import { CourseCard } from "@/features/courses/components/course-card"
import { RegistrarSync } from "@/features/courses/components/registrar-sync"
import { RegisteredScheduleDialog } from "@/features/courses/components/registered-schedule-dialog"
import { selectedCourseId } from "@/features/courses/course-selection"
import {
  ceilingGpa,
  formatGpa,
  projectedGpa,
  semesterGpa,
} from "@/features/courses/gpa"
import type { RegisteredCourse } from "@/features/courses/types"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const myCoursesSearchSchema = z.object({
  course: z.coerce.number().optional(),
})

export const Route = createFileRoute("/_app/courses/")({
  validateSearch: myCoursesSearchSchema,
  component: MyCourses,
})

function GpaSummary({
  courses,
  excludedCount,
}: {
  courses: RegisteredCourse[]
  excludedCount: number
}) {
  const current = semesterGpa(courses)

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">
          {formatGpa(current)}
        </span>
        <span className="text-sm text-muted-foreground">GPA</span>
      </div>
      {excludedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {excludedCount} {excludedCount === 1 ? "course" : "courses"} excluded
        </p>
      )}

      <div className="flex-1 space-y-1">
        {/* Decorative: the figure is already announced as text beside it, so a
            progressbar role would just read the same number twice. */}
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${String((current / 4) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.0</span>
          <span>4.0</span>
        </div>
      </div>

      <dl className="flex gap-6">
        <div>
          <dt className="text-xs text-muted-foreground">Projected</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatGpa(projectedGpa(courses))}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Max possible</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {formatGpa(ceilingGpa(courses))}
          </dd>
        </div>
      </dl>
    </Card>
  )
}

function MyCourses() {
  const { course: requestedCourseId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useQuery(registeredCoursesQueryOptions())
  const [isSyncOpen, setIsSyncOpen] = useState(false)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<number>>(() => new Set())

  return (
    <QueryBoundary
      query={query}
      isEmpty={(courses) => courses.length === 0}
      // With no courses there is nothing else to do on this screen, so the
      // sync form is the page rather than something to go looking for.
      empty={
        <div className="space-y-4">
          <EmptyState
            title="Your course list is empty"
            description="Sync with the registrar to pull in this term's courses."
          />
          <RegistrarSync />
        </div>
      }
    >
      {(courses) => {
        const activeCourseId = selectedCourseId(courses, requestedCourseId)
        const activeCourse =
          courses.find((course) => course.id === activeCourseId) ?? null
        const excludedCount = courses.filter((course) =>
          excludedIds.has(course.id)
        ).length

        return (
          <div className="space-y-4">
            <GpaSummary
              courses={courses.filter((course) => !excludedIds.has(course.id))}
              excludedCount={excludedCount}
            />

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(13rem,0.8fr)_minmax(0,2fr)_minmax(14rem,0.9fr)]">
              <Card className="p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <h2 className="text-sm font-semibold">Courses</h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {courses.length}
                  </span>
                </div>
                <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-1">
                  {courses.map((registered) => {
                    const isActive = registered.id === activeCourseId
                    const gradedCount = registered.items.filter(
                      (item) =>
                        item.obtained_score !== null && item.max_score !== null
                    ).length

                    return (
                      <button
                        key={registered.id}
                        type="button"
                        aria-current={isActive ? "true" : undefined}
                        onClick={() => {
                          void navigate({
                            search: (previous) => ({
                              ...previous,
                              course: registered.id,
                            }),
                          })
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-transparent hover:bg-muted/60"
                        )}
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpenIcon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold">
                            {registered.course.course_code}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {registered.course.title || "Untitled course"}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {gradedCount}/{registered.items.length} graded
                            {excludedIds.has(registered.id)
                              ? " · GPA excluded"
                              : ""}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Card>

              {activeCourse && (
                <CourseCard
                  key={activeCourse.id}
                  registered={activeCourse}
                  excludedFromGpa={excludedIds.has(activeCourse.id)}
                  onToggleGpa={() => {
                    setExcludedIds((previous) => {
                      const next = new Set(previous)
                      if (next.has(activeCourse.id))
                        next.delete(activeCourse.id)
                      else next.add(activeCourse.id)
                      return next
                    })
                  }}
                />
              )}

              <aside className="space-y-4">
                <Card className="space-y-3 p-4">
                  <div>
                    <h2 className="text-sm font-semibold">Workspace actions</h2>
                    <p className="text-xs text-muted-foreground">
                      Timetable and registrar tools apply to your full term.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsScheduleOpen(true)
                    }}
                  >
                    <CalendarDaysIcon aria-hidden />
                    Weekly timetable
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsSyncOpen((open) => !open)
                    }}
                  >
                    <RefreshCcw aria-hidden />
                    {isSyncOpen ? "Hide registrar sync" : "Sync registrar"}
                  </Button>
                </Card>
                {isSyncOpen && <RegistrarSync />}
              </aside>
            </div>

            <RegisteredScheduleDialog
              open={isScheduleOpen}
              onOpenChange={setIsScheduleOpen}
            />
          </div>
        )
      }}
    </QueryBoundary>
  )
}
