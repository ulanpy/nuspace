import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type PageVisibilityValue = "public" | "internal" | "private"

/** The three visibilities, with the copy that explains each. */
export const VISIBILITIES = [
  {
    value: "public",
    title: "Public",
    description: "Anyone, signed in or not, can read this page.",
  },
  {
    value: "internal",
    title: "NU only",
    description:
      "Signed-in students and staff can read it. Outsiders see a 404.",
  },
  {
    value: "private",
    title: "Private",
    description: "Only you and the page's admins can read it.",
  },
] as const satisfies readonly {
  value: PageVisibilityValue
  title: string
  description: string
}[]

const isVisibility = (value: string | null): value is PageVisibilityValue =>
  VISIBILITIES.some((option) => option.value === value)

const selected = (value: PageVisibilityValue) =>
  VISIBILITIES.find((option) => option.value === value) ?? VISIBILITIES[0]

/**
 * The visibility dropdown, shared by the create dialog and the settings page.
 *
 * One list because it is one fact with three values: a page that is private
 * here and public there is a page whose audience depends on which screen you
 * happened to be on.
 *
 * A `<Select>`, not three radios. It is a single field with one current value
 * and nothing to tick off, so a list of three rows of prose with a radio
 * button on the right is three times the ink for the same answer — and in the
 * create dialog it pushed the Save button off the bottom of the form. What
 * the radios had that a `<Select>` has nowhere for, the description of the
 * current value, is below the trigger.
 */
export function VisibilityPicker({
  value,
  onValueChange,
  disabled = false,
  idPrefix = "page-visibility",
}: {
  value: PageVisibilityValue
  onValueChange: (value: PageVisibilityValue) => void
  disabled?: boolean
  /** The dialog and the settings page both render this, so the trigger id
   *  cannot be the same bare string in both. */
  idPrefix?: string
}) {
  const current = selected(value)

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onValueChange={(next) => {
          if (isVisibility(next)) {
            onValueChange(next)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={idPrefix} className="w-full capitalize sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VISIBILITIES.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">{current.description}</p>
    </div>
  )
}
