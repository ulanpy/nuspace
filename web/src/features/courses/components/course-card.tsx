import { useState } from "react"
import { EyeIcon, EyeOffIcon, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

import {
  useAddCourseItem,
  useDeleteCourseItem,
  useUpdateCourseItem,
} from "../api"
import {
  courseScore,
  courseScoreSoFar,
  formatPoints,
  formatWeight,
  isGraded,
  scoreToLetter,
} from "../gpa"
import type { CourseItem, CourseItemDraft, RegisteredCourse } from "../types"
import { AssignmentForm } from "./assignment-form"
import { CourseTemplateTools } from "./course-template-tools"

function ItemRow({ item, onEdit }: { item: CourseItem; onEdit: () => void }) {
  const graded = isGraded(item)

  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "flex w-full items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm",
        "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      <span className="min-w-0 flex-1 truncate">{item.item_name}</span>

      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {item.total_weight_pct === null
          ? "no weight"
          : `${formatWeight(item.total_weight_pct)} of grade`}
      </span>

      <span
        className={cn(
          "w-24 shrink-0 text-right tabular-nums",
          graded ? "font-medium" : "text-muted-foreground"
        )}
      >
        {graded
          ? `${formatPoints(item.obtained_score)} / ${formatPoints(item.max_score)}`
          : "not graded"}
      </span>
    </button>
  )
}

export function CourseCard({
  registered,
  excludedFromGpa = false,
  onToggleGpa,
}: {
  registered: RegisteredCourse
  excludedFromGpa?: boolean
  onToggleGpa?: () => void
}) {
  const { course } = registered
  /**
   * The API returns items in update order, so editing one makes it jump to the
   * bottom of the list — right after you've clicked it, which reads as if
   * something went wrong. Creation order is stable and matches the syllabus
   * order they were entered in.
   */
  const items = [...registered.items].sort((a, b) => a.id - b.id)

  /** The item being edited, or "new" while adding. Only one at a time. */
  const [editing, setEditing] = useState<number | "new" | null>(null)

  const addItem = useAddCourseItem()
  const updateItem = useUpdateCourseItem()
  const deleteItem = useDeleteCourseItem()

  const graded = items.filter(isGraded)
  const soFar = courseScoreSoFar(items)
  const banked = courseScore(items)
  const weightGraded = graded.reduce(
    (total, item) => total + (item.total_weight_pct ?? 0),
    0
  )

  const isPending =
    addItem.isPending || updateItem.isPending || deleteItem.isPending

  const close = () => {
    setEditing(null)
  }

  const save = (values: CourseItemDraft) => {
    if (editing === "new") {
      addItem.mutate(
        { ...values, student_course_id: registered.id },
        { onSuccess: close }
      )
    } else if (editing !== null) {
      updateItem.mutate({ ...values, itemId: editing }, { onSuccess: close })
    }
  }

  const editingItem =
    typeof editing === "number"
      ? items.find((item) => item.id === editing)
      : undefined

  return (
    <>
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {course.course_code}
              {course.title && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · {course.title}
                </span>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">
              {course.credits ?? 0} credits
              {registered.class_average !== null &&
                registered.class_average !== undefined &&
                ` · class average ${formatWeight(registered.class_average)}`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {graded.length > 0 && (
              <Badge variant="secondary" className="tabular-nums">
                {scoreToLetter(soFar)} · {formatWeight(soFar)}
              </Badge>
            )}
          </div>
        </div>

        {items.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {/* Both readings, because they diverge hard early in a term: banked
              counts ungraded work as zero, so it looks alarming in week three. */}
            {formatWeight(banked)} banked of {formatWeight(weightGraded)} graded
            · {graded.length} of {items.length} items
          </p>
        )}

        <div className="space-y-2">
          {excludedFromGpa && (
            <p className="rounded-lg border border-warning/50 bg-warning/5 px-3 py-2 text-xs text-warning">
              This course is excluded from the GPA summary until the page is
              reloaded or you include it again.
            </p>
          )}
          {items.length === 0 && (
            <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              No assignments yet. Add the ones on your syllabus to track this
              course.
            </p>
          )}

          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={() => {
                setEditing(item.id)
              }}
            />
          ))}

          <Button
            size="sm"
            variant="outline"
            className="mt-1"
            onClick={() => {
              setEditing("new")
            }}
          >
            <Plus aria-hidden />
            Add assignment
          </Button>
        </div>

        <div className="flex flex-wrap gap-1 border-t pt-4">
          {onToggleGpa && (
            <Button size="sm" variant="ghost" onClick={onToggleGpa}>
              {excludedFromGpa ? (
                <EyeIcon aria-hidden />
              ) : (
                <EyeOffIcon aria-hidden />
              )}
              {excludedFromGpa ? "Include in GPA" : "Exclude from GPA"}
            </Button>
          )}
          <CourseTemplateTools registered={registered} />
        </div>
      </Card>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !isPending) close()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing === "new" ? "Add assignment" : "Edit assignment"}
            </DialogTitle>
            <DialogDescription>
              {course.course_code} · scores can stay blank until work is graded.
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <AssignmentForm
              item={editingItem}
              isPending={isPending}
              onCancel={close}
              onSubmit={save}
            >
              {editingItem && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={isPending}
                  onClick={() => {
                    deleteItem.mutate(editingItem.id, { onSuccess: close })
                  }}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              )}
            </AssignmentForm>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
