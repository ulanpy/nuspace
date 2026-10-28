import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  courseCodeChip,
  departmentAccent,
  pendingCount,
} from "@/lib/courses/gpa"
import type { RegisteredCourse } from "@/lib/courses"
import { cn } from "@/lib/utils"

/**
 * The registered courses, one row each: a department-coloured edge on the
 * course you are looking at, a tinted code chip, and a dot while assignments
 * are still waiting on a score.
 */
export function CourseList({
  courses,
  selectedId,
  excludedIds,
  onSelect,
}: {
  courses: readonly RegisteredCourse[]
  selectedId: number | null
  excludedIds: ReadonlySet<number>
  onSelect: (courseId: number) => void
}) {
  const excludedCount = courses.filter((course) =>
    excludedIds.has(course.id)
  ).length

  return (
    <Card size="sm" className="gap-3 p-3">
      <div className="flex items-center gap-2 px-0.5">
        <h2 className="text-sm font-semibold">Courses</h2>
        <Badge variant="secondary" className="tabular-nums">
          {courses.length}
        </Badge>
        {excludedCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {excludedCount} excluded from GPA
          </span>
        )}
      </div>

      <div className="space-y-1">
        {courses.map((registered) => {
          const accent = departmentAccent(registered.course.school)
          const pending = pendingCount(registered.items)
          const isActive = registered.id === selectedId
          const isExcluded = excludedIds.has(registered.id)

          return (
            <button
              key={registered.id}
              type="button"
              onClick={() => {
                onSelect(registered.id)
              }}
              aria-pressed={isActive}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-xl border border-l-[3px] px-2.5 py-2 text-left transition-colors",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                accent.border,
                isActive ? "bg-muted/50" : "bg-card hover:bg-muted/40"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                  accent.chip
                )}
              >
                {courseCodeChip(registered.course.course_code)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] leading-none font-semibold">
                    {registered.course.course_code}
                  </span>
                  {pending > 0 && (
                    <>
                      <span
                        aria-hidden
                        title={`${String(pending)} pending`}
                        className="size-1.5 shrink-0 rounded-full bg-warning"
                      />
                      <span className="sr-only">
                        {String(pending)} pending{" "}
                        {pending === 1 ? "assignment" : "assignments"}
                      </span>
                    </>
                  )}
                  {isExcluded && (
                    <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                      Excluded
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-xs leading-none text-muted-foreground">
                  {registered.course.title ??
                    registered.course.school ??
                    "Course"}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
