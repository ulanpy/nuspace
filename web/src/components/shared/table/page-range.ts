/**
 * "Showing 11–20 of 84" for a one-based page of `size`.
 *
 * Null when there is nothing to show, so each caller does not have to decide
 * what an empty list should say about its own range.
 */
export function pageRangeSummary(
  data:
    | { page: number; size: number; total: number; items?: readonly unknown[] }
    | undefined,
  /**
   * Rows rendered above the server page, outside it — the admins table pins
   * "You" and "Owner" there. A community with no admins still has two rows on
   * screen, and a footer that says nothing beside them reads as a bug.
   */
  pinned = 0
): string | null {
  // `items` is optional in the generated types for the lists that declare it
  // with a default, so its absence has to mean "nothing to count" rather than
  // "count zero" — the latter would print a range for a page that never came.
  if (!data || !data.items) return null
  if (data.total === 0) {
    // Only the pinned rows are showing, so they are the whole table. Counted
    // rather than described, because "Showing 1–2 of 2" is what the reader is
    // looking at.
    return pinned > 0
      ? `Showing 1–${String(pinned)} of ${String(pinned)}`
      : null
  }
  const first = (data.page - 1) * data.size + 1
  const last = first + data.items.length - 1
  return `Showing ${String(first)}–${String(last)} of ${String(data.total)}`
}
