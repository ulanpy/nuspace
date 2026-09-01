import { useRef } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { MarkdownToolbar } from "@/components/markdown-toolbar"
import { ToggleChip } from "@/components/toggle-chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  OPPORTUNITY_MAJORS,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  YEARS_BY_LEVEL,
  normalizeMajors,
  type EducationLevel,
  type Opportunity,
  type OpportunityCreate,
  type OpportunityEligibility,
} from "@/features/opportunities/types"

/** Client-side only; the backend has no ceiling. Carried over from the old form. */
const MAX_DESCRIPTION = 1250

const opportunitySchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    host: z.string().trim(),
    type: z.enum(OPPORTUNITY_TYPES),
    majors: z.array(z.enum(OPPORTUNITY_MAJORS)),
    levels: z
      .array(z.enum(EDUCATION_LEVELS))
      .min(1, "Pick at least one education level"),
    /**
     * Years chosen per level. Partial because a level the user has not touched
     * has no entry at all, which is different from an empty one; PhD is never
     * populated — see YEARS_BY_LEVEL.
     */
    years: z.partialRecord(z.enum(EDUCATION_LEVELS), z.array(z.number())),
    description: z
      .string()
      .trim()
      .min(1, "Description is required")
      .max(
        MAX_DESCRIPTION,
        `Description cannot exceed ${String(MAX_DESCRIPTION)} characters`
      ),
    /** When true the opportunity has no deadline and is always open. */
    yearRound: z.boolean(),
    deadline: z.string(),
    funding: z.string().trim(),
    location: z.string().trim(),
    link: z
      .string()
      .trim()
      .refine((value) => value === "" || isHttpUrl(value), {
        message: "Enter a full URL starting with http:// or https://",
      }),
  })
  .refine((values) => values.yearRound || values.deadline !== "", {
    message: "Enter a deadline, or mark the opportunity as year-round",
    path: ["deadline"],
  })

type OpportunityFormValues = z.infer<typeof opportunitySchema>

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}

function toValues(opportunity?: Opportunity): OpportunityFormValues {
  const years: Partial<Record<EducationLevel, number[]>> = {}
  const levels: EducationLevel[] = []

  for (const entry of opportunity?.eligibilities ?? []) {
    const level = entry.education_level
    if (!levels.includes(level)) levels.push(level)
    // `year: null` is "the whole level", which is a level with no years
    // selected rather than a year to check.
    if (entry.year !== null) {
      years[level] = [...(years[level] ?? []), entry.year]
    }
  }

  return {
    name: opportunity?.name ?? "",
    host: opportunity?.host ?? "",
    type: opportunity?.type ?? OPPORTUNITY_TYPES[0],
    majors: normalizeMajors(opportunity?.majors),
    levels,
    years,
    description: opportunity?.description ?? "",
    yearRound: opportunity ? opportunity.deadline == null : false,
    deadline: opportunity?.deadline ?? "",
    funding: opportunity?.funding ?? "",
    location: opportunity?.location ?? "",
    link: opportunity?.link ?? "",
  }
}

/** Empty optional text is stored as NULL, not "". */
function optional(value: string): string | null {
  return value === "" ? null : value
}

/**
 * Flattens the two-dimensional picker into the rows the backend stores.
 *
 * The form asks "which levels?" and then "which years, per level?", but
 * `OpportunityEligibility` is a flat list of `(education_level, year)` pairs.
 * A level with no years chosen means the entire level, which is one row with
 * `year: null` — not zero rows, which would mean nobody is eligible. PhD is
 * always `year: null` because a PhD has no year to pick.
 */
export function toEligibilities(
  levels: readonly EducationLevel[],
  years: Partial<Record<EducationLevel, number[]>>
): OpportunityCreate["eligibilities"] {
  return levels.flatMap((level): OpportunityEligibility[] => {
    const chosen = level === "PhD" ? [] : (years[level] ?? [])
    if (chosen.length === 0) return [{ education_level: level, year: null }]
    return chosen.map((year) => ({ education_level: level, year }))
  })
}

function toPayload(values: OpportunityFormValues): OpportunityCreate {
  return {
    name: values.name,
    description: values.description,
    host: optional(values.host),
    type: values.type,
    majors: values.majors,
    eligibilities: toEligibilities(values.levels, values.years),
    link: optional(values.link),
    location: optional(values.location),
    funding: optional(values.funding),
    deadline: values.yearRound ? null : values.deadline,
  }
}

interface OpportunityFormProps {
  /** Omitted when creating. */
  opportunity?: Opportunity
  onSubmit: (payload: OpportunityCreate) => void
  onCancel: () => void
  isPending: boolean
  /** Message from the failed request, if the last submit was rejected. */
  submitError?: string | null
}

export function OpportunityForm({
  opportunity,
  onSubmit,
  onCancel,
  isPending,
  submitError,
}: OpportunityFormProps) {
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: toValues(opportunity),
  })

  const { errors } = form.formState
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const description = form.watch("description")
  const levels = form.watch("levels")
  const yearRound = form.watch("yearRound")

  const descriptionField = form.register("description")

  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          onSubmit(toPayload(values))
        })(event)
      }}
      className="space-y-5"
    >
      <div className="space-y-1">
        <Label htmlFor="opportunity-name">Name</Label>
        <Input
          id="opportunity-name"
          disabled={isPending}
          {...form.register("name")}
        />
        <FieldError message={errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="opportunity-host">Host</Label>
          <Input
            id="opportunity-host"
            placeholder="Organisation"
            disabled={isPending}
            {...form.register("host")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="opportunity-type">Type</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (value) field.onChange(value)
                }}
                disabled={isPending}
              >
                <SelectTrigger id="opportunity-type" className="w-full">
                  <SelectValue>
                    {OPPORTUNITY_TYPE_LABELS[field.value]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OPPORTUNITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {OPPORTUNITY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <Controller
        control={form.control}
        name="majors"
        render={({ field }) => (
          <MajorPicker
            selected={field.value}
            onChange={field.onChange}
            disabled={isPending}
          />
        )}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Who can apply</legend>

        <Controller
          control={form.control}
          name="levels"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1">
              {EDUCATION_LEVELS.map((level) => (
                <ToggleChip
                  key={level}
                  label={EDUCATION_LEVEL_LABELS[level]}
                  isActive={field.value.includes(level)}
                  disabled={isPending}
                  onClick={() => {
                    const next = field.value.includes(level)
                      ? field.value.filter((entry) => entry !== level)
                      : [...field.value, level]
                    field.onChange(next)
                    // Years for a level nobody can apply from would be sent
                    // back on the next save.
                    if (!next.includes(level)) {
                      form.setValue(`years.${level}`, [])
                    }
                  }}
                />
              ))}
            </div>
          )}
        />
        <FieldError message={errors.levels?.message} />

        {levels.map((level) =>
          YEARS_BY_LEVEL[level].length === 0 ? null : (
            <Controller
              key={level}
              control={form.control}
              name={`years.${level}`}
              render={({ field }) => (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-28 text-sm text-muted-foreground">
                    {EDUCATION_LEVEL_LABELS[level]}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {YEARS_BY_LEVEL[level].map((year) => {
                      const chosen = field.value ?? []
                      return (
                        <ToggleChip
                          key={year}
                          label={`Year ${String(year)}`}
                          isActive={chosen.includes(year)}
                          disabled={isPending}
                          onClick={() => {
                            field.onChange(
                              chosen.includes(year)
                                ? chosen.filter((entry) => entry !== year)
                                : [...chosen, year]
                            )
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            />
          )
        )}

        <p className="text-xs text-muted-foreground">
          A level with no years chosen means the whole level is eligible.
        </p>
      </fieldset>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="opportunity-description">Description</Label>
          <span className="text-xs text-muted-foreground">
            {String(description.length)} / {String(MAX_DESCRIPTION)}
          </span>
        </div>

        <MarkdownToolbar
          textareaRef={descriptionRef}
          value={description}
          disabled={isPending}
          onChange={(next) => {
            form.setValue("description", next, { shouldValidate: true })
          }}
        />

        <Textarea
          id="opportunity-description"
          placeholder="What the opportunity is, who it suits, and how selection works."
          className="min-h-30"
          maxLength={MAX_DESCRIPTION}
          disabled={isPending}
          {...descriptionField}
          ref={(element) => {
            descriptionField.ref(element)
            descriptionRef.current = element
          }}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="opportunity-deadline">Deadline</Label>
            <Controller
              control={form.control}
              name="yearRound"
              render={({ field }) => (
                <Button
                  type="button"
                  variant="link"
                  size="xs"
                  disabled={isPending}
                  onClick={() => {
                    const next = !field.value
                    field.onChange(next)
                    if (next) form.setValue("deadline", "")
                  }}
                >
                  {field.value ? "Set a date instead" : "Mark as year-round"}
                </Button>
              )}
            />
          </div>
          <Input
            id="opportunity-deadline"
            type="date"
            disabled={isPending || yearRound}
            {...form.register("deadline", {
              // Picking a date is a clearer statement of intent than the
              // toggle left over from a previous edit.
              onChange: () => {
                form.setValue("yearRound", false)
              },
            })}
          />
          {yearRound && (
            <p className="text-xs text-muted-foreground">
              Shown as year-round, with no closing date.
            </p>
          )}
          <FieldError message={errors.deadline?.message} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="opportunity-funding">Funding</Label>
          <Input
            id="opportunity-funding"
            placeholder="Fully funded"
            disabled={isPending}
            {...form.register("funding")}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="opportunity-location">Location</Label>
          <Input
            id="opportunity-location"
            placeholder="Astana, or Remote"
            disabled={isPending}
            {...form.register("location")}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="opportunity-link">Link</Label>
          <Input
            id="opportunity-link"
            inputMode="url"
            placeholder="https://…"
            disabled={isPending}
            {...form.register("link")}
          />
          <FieldError message={errors.link?.message} />
        </div>
      </div>

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {opportunity ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

/**
 * Forty majors is too many for chips and too many for a plain multi-select, so
 * they live behind a popover with a running count on the trigger.
 */
function MajorPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: readonly string[]
  onChange: (next: string[]) => void
  disabled: boolean
}) {
  const allSelected = selected.length === OPPORTUNITY_MAJORS.length

  return (
    <div className="space-y-1">
      <Label>Majors</Label>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              disabled={disabled}
            >
              {selected.length === 0
                ? "Open to all majors"
                : `${String(selected.length)} selected`}
            </Button>
          }
        />
        <PopoverContent className="w-80">
          <div className="flex items-center justify-between">
            <span className="font-medium">Majors</span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => {
                onChange(allSelected ? [] : [...OPPORTUNITY_MAJORS])
              }}
            >
              {allSelected ? "Clear all" : "Select all"}
            </Button>
          </div>

          <div className="max-h-64 space-y-0.5 overflow-y-auto">
            {OPPORTUNITY_MAJORS.map((major) => (
              <label
                key={major}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={selected.includes(major)}
                  onChange={() => {
                    onChange(
                      selected.includes(major)
                        ? selected.filter((entry) => entry !== major)
                        : [...selected, major]
                    )
                  }}
                />
                <span>{major}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <p className="text-xs text-muted-foreground">
        Leave empty when the opportunity is open to every major.
      </p>
    </div>
  )
}
