import { useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

export function CourseCard({ registered }: { registered: RegisteredCourse }) {
  const { course } = registered
  /**
   * The API returns items in update order, so editing one makes it jump to the
   * bottom of the list — right after you've clicked it, which reads as if
   * something went wrong. Creation order is stable and matches the syllabus
   * order they were entered in.
   */
  const items = [...registered.items].sort((a, b) => a.id - b.id)

  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open)
        }}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-3 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
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
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {items.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {/* Both readings, because they diverge hard early in a term: banked
              counts ungraded work as zero, so it looks alarming in week three. */}
          {formatWeight(banked)} banked of {formatWeight(weightGraded)} graded ·{" "}
          {graded.length} of {items.length} items
        </p>
      )}

      {isOpen && (
        <div className="mt-3 space-y-1 border-t pt-3">
          {items.length === 0 && editing === null && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">
              No assignments yet. Add the ones on your syllabus to track this
              course.
            </p>
          )}

          {items.map((item) =>
            editing === item.id ? (
              <AssignmentForm
                key={item.id}
                item={item}
                isPending={isPending}
                onCancel={close}
                onSubmit={save}
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={isPending}
                  onClick={() => {
                    deleteItem.mutate(item.id, { onSuccess: close })
                  }}
                >
                  <Trash2 aria-hidden />
                  Delete
                </Button>
              </AssignmentForm>
            ) : (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditing(item.id)
                }}
              />
            )
          )}

          {editing === "new" ? (
            <AssignmentForm
              isPending={isPending}
              onCancel={close}
              onSubmit={save}
            />
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="mt-1"
              onClick={() => {
                setEditing("new")
              }}
            >
              <Plus aria-hidden />
              Add assignment
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
