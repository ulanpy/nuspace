/**
 * "Showing 11–20 of 84" for a one-based page of `size`.
 *
 * Null when there is nothing to show, so each caller does not have to decide
 * what an empty list should say about its own range.
 */
export function pageRangeSummary(
  data:
    | { page: number; size: number; total: number; items?: readonly unknown[] }
    | undefined
): string | null {
  // `items` is optional in the generated types for the lists that declare it
  // with a default, so its absence has to mean "nothing to count" rather than
  // "count zero" — the latter would print a range for a page that never came.
  if (!data || data.total === 0 || !data.items) return null
  const first = (data.page - 1) * data.size + 1
  const last = first + data.items.length - 1
  return `Showing ${String(first)}–${String(last)} of ${String(data.total)}`
}
