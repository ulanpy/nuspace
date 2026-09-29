import { PAGE_VISIBILITIES } from "@/lib/pages/constants"
import type { PageVisibilityValue } from "@/lib/pages/types"

/**
 * The human copy for a visibility, and the guards around it.
 *
 * The values themselves live in `lib/pages/constants` — that is the list the
 * routes' zod enums are built from, and a list here too would be a second
 * answer to "what are the visibilities" that nobody would remember to update.
 * This file is about saying one of them in English.
 */

/** Narrows the trigger's `string` to a known visibility. */
export const isVisibility = (
  value: string | null
): value is PageVisibilityValue =>
  PAGE_VISIBILITIES.some((option) => option.value === value)

/** The title and description for the current value, for the caller's `Item`. */
export const visibilityCopy = (value: PageVisibilityValue) =>
  PAGE_VISIBILITIES.find((option) => option.value === value) ??
  PAGE_VISIBILITIES[0]

/**
 * The short name for a visibility, for a table cell.
 *
 * Separate from `visibilityCopy` because a cell has room for one word. The
 * create dialog and the settings page want the sentence; the My Pages table
 * wants the badge, and giving a cell a tooltip-length string is how a five-column
 * table ends up scrolling sideways.
 */
export const visibilityLabel = (value: PageVisibilityValue) =>
  visibilityCopy(value).title
