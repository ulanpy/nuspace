import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { registeredCoursesQueryOptions } from "@/features/courses/api"
import { CourseCard } from "@/features/courses/components/course-card"
import {
  ceilingGpa,
  formatGpa,
  projectedGpa,
  semesterGpa,
} from "@/features/courses/gpa"
import type { RegisteredCourse } from "@/features/courses/types"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { Card } from "@/components/ui/card"

export const Route = createFileRoute("/_app/courses/")({
  component: MyCourses,
})

function GpaSummary({ courses }: { courses: RegisteredCourse[] }) {
  const current = semesterGpa(courses)

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold tabular-nums">
          {formatGpa(current)}
        </span>
        <span className="text-sm text-muted-foreground">GPA</span>
      </div>

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

  return (
    <QueryBoundary
      query={query}
      isEmpty={(courses) => courses.length === 0}
      empty={
        <EmptyState
          title="Your course list is empty"
          description="Sync your schedule to add registered courses."
        />
      }
    >
      {(courses) => (
        <div className="space-y-4">
          <GpaSummary courses={courses} />
          <div className="space-y-3">
            {courses.map((registered) => (
              <CourseCard key={registered.id} registered={registered} />
            ))}
          </div>
        </div>
      )}
    </QueryBoundary>
  )
}
