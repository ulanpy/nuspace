import { useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { CourseItemDraft } from "../types"

/**
 * A number field that is allowed to be blank.
 *
 * Inputs hand back strings, and an untaken exam is a real, expected state — so
 * "" has to mean "not graded yet" rather than 0. Scoring 0 on a midterm and not
 * having sat it are very different numbers to a GPA, and conflating them is the
 * mistake this exists to prevent.
 */
function numericField(label: string, max: number) {
  return z
    .string()
    .trim()
    .refine((value) => value === "" || Number.isFinite(Number(value)), {
      message: `${label} must be a number`,
    })
    .transform((value) => (value === "" ? null : Number(value)))
    .refine((value) => value === null || value >= 0, {
      message: `${label} cannot be negative`,
    })
    .refine((value) => value === null || value <= max, {
      message: `${label} cannot exceed ${String(max)}`,
    })
}

// The API caps scores at 99999.99; weights are a percentage of the course.
const assignmentSchema = z
  .object({
    item_name: z.string().trim().min(1, "Name is required"),
    total_weight_pct: numericField("Weight", 100),
    obtained_score: numericField("Score", 99999.99),
    max_score: numericField("Max score", 99999.99),
  })
  .refine(
    (values) =>
      values.obtained_score === null ||
      (values.max_score !== null && values.max_score > 0),
    {
      // Without this the item looks entered but is skipped by every GPA
      // reading, because a score with nothing to divide by can't be graded.
      message: "Enter what the score is out of",
      path: ["max_score"],
    }
  )

type AssignmentInput = z.input<typeof assignmentSchema>
type AssignmentOutput = z.output<typeof assignmentSchema>

function toInput(item: CourseItemDraft | undefined): AssignmentInput {
  return {
    item_name: item?.item_name ?? "",
    total_weight_pct: item?.total_weight_pct?.toString() ?? "",
    obtained_score: item?.obtained_score?.toString() ?? "",
    max_score: item?.max_score?.toString() ?? "",
  }
}

interface AssignmentFormProps {
  /** Omitted when adding. */
  item?: CourseItemDraft
  onSubmit: (values: AssignmentOutput) => void
  onCancel: () => void
  isPending: boolean
  /** Rendered beside Save — the delete action, when editing. */
  children?: React.ReactNode
}

export function AssignmentForm({
  item,
  onSubmit,
  onCancel,
  isPending,
  children,
}: AssignmentFormProps) {
  const form = useForm<AssignmentInput, unknown, AssignmentOutput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: toInput(item),
  })

  const { errors } = form.formState

  /**
   * This form replaces the control that opened it — the row being edited, or
   * the "Add assignment" button. Without moving focus here, that control is
   * unmounted from under the keyboard and focus falls back to the document, so
   * a keyboard user lands at the top of the page instead of in the field they
   * just asked for.
   */
  const nameRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  const nameField = form.register("item_name")

  return (
    <form
      onSubmit={(event) => {
        // Course cards nest these; without stopping propagation an inner
        // submit would bubble to any outer form.
        event.stopPropagation()
        void form.handleSubmit(onSubmit)(event)
      }}
      className="space-y-3 rounded-lg border bg-muted/30 p-3"
    >
      <div className="space-y-1">
        <Label htmlFor="item_name">Name</Label>
        <Input
          id="item_name"
          placeholder="Midterm"
          {...nameField}
          ref={(element) => {
            nameField.ref(element)
            nameRef.current = element
          }}
        />
        {errors.item_name && (
          <p className="text-xs text-destructive">{errors.item_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="total_weight_pct">Weight %</Label>
          <Input
            id="total_weight_pct"
            inputMode="decimal"
            placeholder="25"
            {...form.register("total_weight_pct")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="obtained_score">Score</Label>
          <Input
            id="obtained_score"
            inputMode="decimal"
            placeholder="—"
            {...form.register("obtained_score")}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="max_score">Out of</Label>
          <Input
            id="max_score"
            inputMode="decimal"
            placeholder="100"
            {...form.register("max_score")}
          />
        </div>
      </div>

      {(errors.total_weight_pct ??
        errors.obtained_score ??
        errors.max_score) && (
        <p className="text-xs text-destructive">
          {errors.total_weight_pct?.message ??
            errors.obtained_score?.message ??
            errors.max_score?.message}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Leave the score blank until the work is graded — a blank is not a zero.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {children}
      </div>
    </form>
  )
}
