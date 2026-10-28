import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  courseScore,
  formatWeight,
  nextUp,
  pendingCount,
} from "@/lib/courses/gpa"
import type { RegisteredCourse } from "@/lib/courses"
import { CourseTemplateTools } from "./course-template-tools"

/**
 * The selected course at a glance, and what can be done to it: add an
 * assignment, share or import a grading setup, and leave it out of the term's
 * GPA. That last switch is a what-if for this visit only; it is not stored.
 */
export function CourseSummary({
  registered,
  isExcluded,
  onToggleExcluded,
  onAdd,
}: {
  registered: RegisteredCourse
  isExcluded: boolean
  onToggleExcluded: () => void
  onAdd: () => void
}) {
  const { course, items } = registered
  const earned = courseScore(items)
  const pending = pendingCount(items)
  const totalWeight = items.reduce(
    (sum, item) => sum + (item.total_weight_pct ?? 0),
    0
  )
  const barPercent = Math.min(100, (earned / Math.max(100, totalWeight)) * 100)

  const rows = [
    { label: "Term", value: course.term || "—" },
    { label: "School", value: course.school || "—" },
    { label: "ECTS", value: course.credits ? String(course.credits) : "—" },
    {
      label: "Assignments",
      value:
        pending > 0
          ? `${String(items.length)} (${String(pending)} pending)`
          : String(items.length),
    },
    { label: "Next up", value: nextUp(items) },
  ]

  return (
    <Card size="sm" className="gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Course summary
        </h2>
        {isExcluded && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Excluded from GPA
          </span>
        )}
      </div>

      <dl className="space-y-2.5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-3"
          >
            <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
            <dd className="max-w-[58%] text-right text-[13px] font-medium">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-center justify-between gap-3">
        <Label
          htmlFor="gpa-exclusion"
          className="text-[13px] font-normal text-muted-foreground"
        >
          Include in overall GPA
        </Label>
        <Switch
          id="gpa-exclusion"
          size="sm"
          checked={!isExcluded}
          onCheckedChange={onToggleExcluded}
        />
      </div>
      {isExcluded && (
        <p className="text-xs text-muted-foreground">
          Left out of the GPA above until you include it again or reload the
          page. Nothing is saved.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted-foreground">Earned grade</span>
          <span className="font-medium text-success tabular-nums">
            {formatWeight(earned)}
          </span>
        </div>
        <Progress
          value={barPercent}
          aria-label="Earned grade"
          className="**:data-[slot=progress-indicator]:bg-success"
        />
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Button size="sm" className="w-full" onClick={onAdd}>
          <PlusIcon aria-hidden />
          Add assignment
        </Button>
        <div className="flex flex-wrap gap-1">
          <CourseTemplateTools registered={registered} />
        </div>
      </div>
    </Card>
  )
}
