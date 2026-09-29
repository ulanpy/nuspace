import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_VISIBILITIES } from "@/lib/pages/constants"
import type { PageVisibilityValue } from "@/lib/pages/types"
import { isVisibility } from "./visibilities"

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
 * create dialog it pushed the Save button off the bottom of the form.
 *
 * The trigger only, so it drops into an `Item` like any other control: the
 * title and description of the current value are the `Item`'s job, on the
 * left, with the dropdown in `ItemActions`. What the radios carried on their
 * own, both call sites now own.
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
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        // Guarded rather than cast: an unknown value must not reach the form.
        if (isVisibility(next)) {
          onValueChange(next)
        }
      }}
      disabled={disabled}
      // Without this the trigger falls back to the raw value and `capitalize`
      // renders "Internal" directly above a dropdown saying "Members only" --
      // the same control disagreeing with itself. Derived from
      // `PAGE_VISIBILITIES` rather than written out, so the trigger's label and
      // the items below are the same strings from the same list. (A
      // `Record<string, ReactNode>` is the other shape base-ui accepts; the
      // array needs no cast to keep the literal key type.)
      items={PAGE_VISIBILITIES.map((option) => ({
        label: option.title,
        value: option.value,
      }))}
    >
      {/* No `capitalize`: the label is the sentence-cased title, and
          capitalizing it was a second, different rendering of the same value. */}
      <SelectTrigger id={idPrefix} className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PAGE_VISIBILITIES.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
