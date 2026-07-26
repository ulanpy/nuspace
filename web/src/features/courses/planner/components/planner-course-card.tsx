import { Loader2, RefreshCcw, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import {
  useLoadSections,
  useRemovePlannerCourse,
  useSelectSections,
} from "../api"
import {
  DEMAND_LABEL,
  demandLevel,
  demandRatio,
  formatDays,
  formatRoom,
  groupSectionsByType,
  nextSectionSelection,
  normalizeTitle,
} from "../schedule"
import type { PlannerCourse, PlannerSection } from "../types"

function sectionSummary(section: PlannerSection): string {
  const parts = [
    formatDays(section),
    section.times,
    formatRoom(section.room),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(" · ") : "Time TBA"
}

interface SectionButtonProps {
  section: PlannerSection
  clashes: ReadonlySet<number>
  onSelect: () => void
  disabled: boolean
}

function SectionButton({
  section,
  clashes,
  onSelect,
  disabled,
}: SectionButtonProps) {
  const level = demandLevel(demandRatio(section))
  const isClashing = clashes.has(section.id)

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={section.is_selected}
      className={cn(
        "w-full rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-60",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        section.is_selected
          ? "border-primary bg-primary/10"
          : "hover:bg-muted/50",
        isClashing &&
          section.is_selected &&
          "border-destructive bg-destructive/10"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{section.section_code}</span>
        {section.capacity != null && (
          <span
            className={cn(
              "text-xs tabular-nums",
              level === "full" ? "text-destructive" : "text-muted-foreground"
            )}
            title={DEMAND_LABEL[level]}
          >
            {section.enrollment_snapshot ?? 0}/{section.capacity}
          </span>
        )}
      </div>
      <span className="block text-xs text-muted-foreground">
        {sectionSummary(section)}
      </span>
      {section.faculty && (
        <span className="block truncate text-xs text-muted-foreground">
          {section.faculty}
        </span>
      )}
      {isClashing && section.is_selected && (
        <span className="mt-1 block text-xs font-medium text-destructive">
          Conflicts with another selected section
        </span>
      )}
    </button>
  )
}

interface PlannerCourseCardProps {
  course: PlannerCourse
  clashes: ReadonlySet<number>
  /** Which saved plan this card belongs to, so refetches hit the right one. */
  scheduleId: number | null
}

export function PlannerCourseCard({
  course,
  clashes,
  scheduleId,
}: PlannerCourseCardProps) {
  const loadSections = useLoadSections({ scheduleId })
  const selectSections = useSelectSections({ scheduleId })
  const removeCourse = useRemovePlannerCourse({ scheduleId })

  const groups = groupSectionsByType(course.sections)
  const isBusy =
    (loadSections.isPending && loadSections.variables.courseId === course.id) ||
    (selectSections.isPending &&
      selectSections.variables.courseId === course.id)

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{course.course_code}</h3>
          <p className="text-sm text-muted-foreground">
            {normalizeTitle(course.title)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {course.level && <Badge variant="outline">{course.level}</Badge>}
            {course.school && (
              <Badge variant="secondary">{course.school}</Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            disabled={isBusy}
            onClick={() => {
              loadSections.mutate({ courseId: course.id, refresh: true })
            }}
          >
            {isBusy ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <RefreshCcw aria-hidden />
            )}
            <span className="sr-only sm:not-sr-only">Sections</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={removeCourse.isPending}
            onClick={() => {
              removeCourse.mutate(course.id)
            }}
          >
            <Trash2 aria-hidden />
            <span className="sr-only">Remove {course.course_code}</span>
          </Button>
        </div>
      </div>

      {course.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sections loaded yet — fetch them from the registrar to pick times.
        </p>
      ) : (
        groups.map((group) => (
          <fieldset key={group.typeKey} className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground uppercase">
              {group.label}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.sections.map((section) => (
                <SectionButton
                  key={section.id}
                  section={section}
                  clashes={clashes}
                  disabled={isBusy}
                  onSelect={() => {
                    // Deselecting is picking the same section again: the API
                    // takes the full set, so we just drop it from the list.
                    const sectionIds = section.is_selected
                      ? course.sections
                          .filter(
                            (it) => it.is_selected && it.id !== section.id
                          )
                          .map((it) => it.id)
                      : nextSectionSelection(course.sections, section.id)

                    selectSections.mutate({ courseId: course.id, sectionIds })
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))
      )}
    </Card>
  )
}
