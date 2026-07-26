import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { CalendarDaysIcon, RefreshCcw } from "lucide-react"

import { registeredCoursesQueryOptions } from "@/features/courses/api"
import { CourseCard } from "@/features/courses/components/course-card"
import { RegistrarSync } from "@/features/courses/components/registrar-sync"
import { RegisteredScheduleDialog } from "@/features/courses/components/registered-schedule-dialog"
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

export const Route = createFileRoute("/_app/courses/")({
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
        const excludedCount = courses.filter((course) =>
          excludedIds.has(course.id)
        ).length
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsScheduleOpen(true)
                }}
              >
                <CalendarDaysIcon aria-hidden />
                Weekly timetable
              </Button>
            </div>
            <GpaSummary
              courses={courses.filter((course) => !excludedIds.has(course.id))}
              excludedCount={excludedCount}
            />
            <div className="space-y-3">
              {courses.map((registered) => (
                <CourseCard
                  key={registered.id}
                  registered={registered}
                  excludedFromGpa={excludedIds.has(registered.id)}
                  onToggleGpa={() => {
                    setExcludedIds((previous) => {
                      const next = new Set(previous)
                      if (next.has(registered.id)) next.delete(registered.id)
                      else next.add(registered.id)
                      return next
                    })
                  }}
                />
              ))}
            </div>

            {isSyncOpen ? (
              <RegistrarSync />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsSyncOpen(true)
                }}
              >
                <RefreshCcw aria-hidden />
                Sync with the registrar
              </Button>
            )}
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
