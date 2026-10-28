import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CourseLinks } from "@/components/routes/courses/planner/components/course-links"

import { useRemovePlannerCourse } from "@/lib/courses/planner"
import { normalizeTitle } from "@/lib/courses/planner/schedule"
import type { PlannerCourse } from "@/lib/courses/planner"

/**
 * One planned course in the shortlist. Selecting it opens its section
 * controls under the schedule; the bin takes it out of the plan.
 */
export function ShortlistCard({
  course,
  isActive,
  scheduleId,
  syllabus,
  onSelect,
}: {
  course: PlannerCourse
  isActive: boolean
  /** Which saved plan the course belongs to, so the refetch hits the right one. */
  scheduleId: number | null
  syllabus: string | undefined
  onSelect: () => void
}) {
  const removeCourse = useRemovePlannerCourse({ scheduleId })
  const selectedCount = course.sections.filter(
    (section) => section.is_selected
  ).length
  const meta = [course.school, course.term_label, course.level].filter(Boolean)

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-primary",
        isActive ? "border-primary bg-primary/5" : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          aria-current={isActive ? "true" : undefined}
          onClick={onSelect}
          className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none"
        >
          <span className="block font-semibold">{course.course_code}</span>
          {course.title && (
            <span className="block text-xs text-muted-foreground">
              {normalizeTitle(course.title)}
            </span>
          )}
          {meta.length > 0 && (
            <span className="block text-xs text-muted-foreground">
              {meta.join(" · ")}
            </span>
          )}
          <span className="block text-xs text-muted-foreground">
            {selectedCount || "No"} selected{" "}
            {selectedCount === 1 ? "section" : "sections"}
          </span>
        </button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-destructive"
          aria-label={`Remove ${course.course_code}`}
          disabled={removeCourse.isPending}
          onClick={() => {
            removeCourse.mutate(course.id)
          }}
        >
          <Trash2Icon aria-hidden />
        </Button>
      </div>
      <CourseLinks course={course} syllabus={syllabus} />
    </div>
  )
}
