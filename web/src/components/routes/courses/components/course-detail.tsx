import { ClipboardListIcon, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  courseCodeChip,
  courseScore,
  courseScoreCeiling,
  departmentAccent,
  formatGpa,
  formatPoints,
  formatWeight,
  gradeBreakdown,
  isGraded,
  scoreToGpa,
  scoreToLetter,
} from "@/lib/courses/gpa"
import type { BreakdownKind } from "@/lib/courses/gpa"
import type { CourseItem, RegisteredCourse } from "@/lib/courses"
import { cn } from "@/lib/utils"

const BREAKDOWN_TONES: Record<BreakdownKind, { label: string; tone: string }> =
  {
    earned: { label: "Earned", tone: "bg-success" },
    lost: { label: "Below max", tone: "bg-muted-foreground" },
    pending: { label: "Pending scores", tone: "bg-warning" },
    unassigned: { label: "Unassigned weight", tone: "bg-foreground/35" },
  }

function GradeBreakdown({ items }: { items: readonly CourseItem[] }) {
  const { segments, scale } = gradeBreakdown(items)

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-medium text-muted-foreground">
        Grade breakdown
      </p>
      <div
        aria-hidden
        className="flex h-1.5 overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment) => (
          <div
            key={segment.kind}
            className={BREAKDOWN_TONES[segment.kind].tone}
            style={{ width: `${String((segment.value / scale) * 100)}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {segments.map((segment) => {
          const { label, tone } = BREAKDOWN_TONES[segment.kind]
          return (
            <li key={segment.kind} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn("size-1.5 rounded-full", tone)} />
              {label}
              {segment.kind === "earned"
                ? ` ${formatWeight(segment.value)}`
                : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

/**
 * One course's assignments as a table, with the grade breakdown and the
 * course's own score and GPA. Editing and deleting are the caller's: the rows
 * only say which item was asked for.
 */
export function CourseDetail({
  registered,
  onEdit,
  onDelete,
}: {
  registered: RegisteredCourse
  onEdit: (itemId: number) => void
  onDelete: (itemId: number) => void
}) {
  const { course } = registered
  /**
   * The API returns items in update order, so editing one makes it jump to the
   * bottom of the list, right after you clicked it, which reads as if
   * something went wrong. Creation order is stable and matches the syllabus
   * order they were entered in.
   */
  const items = [...registered.items].sort((a, b) => a.id - b.id)

  const accent = departmentAccent(course.school)
  const score = courseScore(items)
  const gpa = scoreToGpa(score)
  const ceiling = scoreToGpa(courseScoreCeiling(items))

  return (
    <Card className="@container gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
              accent.chip
            )}
          >
            {courseCodeChip(course.course_code)}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-lg/tight font-semibold">
              {course.course_code}
            </h2>
            {course.title && (
              <p className="truncate text-[13px] text-muted-foreground">
                {course.title}
              </p>
            )}
          </div>
        </div>

        <dl className="flex items-center gap-4">
          <div className="text-right">
            <dt className="text-[11px] text-muted-foreground">Grade</dt>
            <dd className="text-base font-semibold">{scoreToLetter(score)}</dd>
          </div>
          <div className="text-right">
            <dt className="text-[11px] text-muted-foreground">GPA</dt>
            <dd className="text-base font-semibold tabular-nums">
              {formatGpa(gpa)}
            </dd>
          </div>
        </dl>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 py-2">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardListIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium">No assignments yet</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
              Add the ones on your syllabus from Course summary to track this
              course, or import a setup a classmate shared.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Table className="text-[13px] text-muted-foreground">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto pr-3 pb-2 text-muted-foreground">
                  Assignment
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground">
                  Weight
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground">
                  Score
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-right text-muted-foreground @max-md:hidden">
                  Contribution
                </TableHead>
                <TableHead className="h-auto pr-3 pb-2 text-muted-foreground @max-md:hidden">
                  Status
                </TableHead>
                <TableHead className="h-auto w-16 pb-2">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const done = isGraded(item)
                const contribution = done
                  ? (item.obtained_score / item.max_score) *
                    (item.total_weight_pct ?? 0)
                  : null

                return (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-24 py-2 pr-3 font-medium whitespace-normal text-foreground">
                      {item.item_name}
                      {/* The Status column is hidden in a narrow card; the
                          state moves under the name instead of vanishing. */}
                      <span
                        className={cn(
                          "block text-xs font-medium @md:hidden",
                          done ? "text-success" : "text-warning"
                        )}
                      >
                        {done ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums">
                      {item.total_weight_pct === null
                        ? "—"
                        : formatWeight(item.total_weight_pct)}
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums">
                      {done
                        ? `${formatPoints(item.obtained_score)} / ${formatPoints(item.max_score)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="py-2 pr-3 text-right tabular-nums @max-md:hidden">
                      {contribution === null ? "—" : formatWeight(contribution)}
                    </TableCell>
                    <TableCell className="py-2 pr-3 @max-md:hidden">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          done ? "text-success" : "text-warning"
                        )}
                      >
                        {done ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${item.item_name}`}
                          onClick={() => {
                            onEdit(item.id)
                          }}
                        >
                          <PencilIcon aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          aria-label={`Delete ${item.item_name}`}
                          onClick={() => {
                            onDelete(item.id)
                          }}
                        >
                          <Trash2Icon aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <GradeBreakdown items={items} />

          <dl className="grid grid-cols-2 gap-4 @md:grid-cols-4">
            <Stat label="Current score" value={formatWeight(score)} />
            {registered.class_average !== null &&
              registered.class_average !== undefined && (
                <Stat
                  label="Class average"
                  value={formatWeight(registered.class_average)}
                />
              )}
            <Stat label="Current GPA" value={formatGpa(gpa)} />
            <Stat label="Maximum possible" value={formatGpa(ceiling)} />
          </dl>
        </>
      )}
    </Card>
  )
}
