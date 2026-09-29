/**
 * Which page numbers to show, and where the gaps go.
 *
 * Always the first and last page, `window` pages either side of the current
 * one, and an ellipsis wherever that leaves a hole. A long table therefore
 * reads `1 … 4 5 6 … 20` instead of either all 20 numbers or just the two
 * arrows.
 *
 * Pure and exported so the arithmetic can be tested without rendering: the
 * markup around it is trivial, the arithmetic is not.
 *
 * @param current 1-based page being viewed. Clamped into range, so a stale
 *   `?page=99` on a three-page table yields three pages and not a hole.
 * @param total   1-based count of pages. Zero or less yields nothing at all.
 * @param window  Neighbours either side of the current page. 0 shows the
 *   current page alone between the ellipses.
 * @returns Page numbers ascending, with `"…"` standing in for a run of pages
 *   that is not shown.
 */
export function pageNumbers(
  current: number,
  total: number,
  window = 1
): (number | "…")[] {
  // Nothing to page through. Handing back `[1]` here would render a control
  // that claims there is a first page when the table is empty.
  if (total < 1) return []
  if (total === 1) return [1]

  // A `?page=` out of range — after a filter narrows the list, or a hand-typed
  // URL — must not produce a window past the end and a second ellipsis after
  // the last page. Clamping fixes both, and is why this returns no range error.
  const currentPage = Math.min(Math.max(current, 1), total)

  const first = 1
  const last = total
  const start = Math.max(currentPage - window, 1)
  const end = Math.min(currentPage + window, total)

  const pages: (number | "…")[] = [first]

  if (start > first + 1) pages.push("…")

  // The ends are already in, by `first` above and `last` below. Skipping them
  // here is what keeps a 2-page table from rendering `1 2 2`.
  for (let page = start; page <= end; page++) {
    if (page > first && page < last) pages.push(page)
  }

  if (end < last - 1) pages.push("…")

  pages.push(last)

  return pages
}
