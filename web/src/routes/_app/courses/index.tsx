import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { registeredCoursesQueryOptions } from "@/features/courses/api"
import {
  ceilingGpa,
  courseScore,
  courseScoreSoFar,
  formatGpa,
  formatWeight,
  isGraded,
  projectedGpa,
  scoreToLetter,
  semesterGpa,
} from "@/features/courses/gpa"
import type { RegisteredCourse } from "@/features/courses/types"
import { EmptyState, QueryBoundary } from "@/components/query-boundary"
import { Badge } from "@/components/ui/badge"
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

function CourseRow({ registered }: { registered: RegisteredCourse }) {
  const { course, items } = registered
  const graded = items.filter(isGraded)
  const soFar = courseScoreSoFar(items)
  const banked = courseScore(items)

  const weightGraded = graded.reduce(
    (total, item) => total + (item.total_weight_pct ?? 0),
    0
  )

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">
            {course.course_code}
            {course.title && (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {course.title}
              </span>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {course.credits ?? 0} credits
            {registered.class_average != null &&
              ` · class average ${formatWeight(registered.class_average)}`}
          </p>
        </div>

        {graded.length > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {scoreToLetter(soFar)} · {formatWeight(soFar)}
          </Badge>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignments yet.</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {/* Both readings, because they diverge hard early in a term: banked
              counts ungraded work as zero, so it looks alarming in week three. */}
          {formatWeight(banked)} banked of {formatWeight(weightGraded)} graded ·{" "}
          {graded.length} of {items.length} items
        </p>
      )}
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
              <CourseRow key={registered.id} registered={registered} />
            ))}
          </div>
        </div>
      )}
    </QueryBoundary>
  )
}
