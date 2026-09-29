import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table"

export interface UseDataTableOptions<TData extends RowData> {
  /** One page of rows, as the server returned it. Never the whole set. */
  data: TData[]
  columns: ColumnDef<TData>[]
  /**
   * Which route column is currently sorted, and in which direction.
   *
   * Read from the URL by the caller rather than kept here. The sort is a
   * server-side instruction — the hook cannot reorder rows it only has one
   * page of — so the URL is the only place the answer can live, and it is the
   * only place that survives a reload, a back button, and a link someone
   * pastes to a colleague.
   *
   * Passed in rather than synced by the hook on purpose. A hook that watched
   * the URL and pushed to it would be a second source of truth for the same
   * state, and the two would disagree for exactly one frame.
   */
  sorting?: SortingState
  getRowId: (row: TData) => string
}

/**
 * The one place `@tanstack/react-table` is configured.
 *
 * `manualPagination` and `manualSorting` are the two flags the whole plan turns
 * on. Without them react-table sorts and pages the array it is given, which is
 * one page of the result — so "sort by name" would order ten of your pages and
 * leave the other ninety in whatever order the server sent, which is worse
 * than not offering the sort at all. Page state stays in the URL, so
 * `pageCount`, `getPaginationRowModel` and friends are deliberately absent.
 *
 * Row *filtering* is deliberately not configured either, and there is no
 * `getFilteredRowModel`. The paginated tables filter server-side through their
 * route's `validateSearch`; filtering the same rows again in the browser is how
 * the two drift, and the symptom is a footer that says "showing 3 of 40" above
 * a table with three rows in it.
 *
 * Pinned to `@tanstack/react-table` v8. v9 is a rewrite around `useTable` and
 * feature flags, and its row/column accessors are different objects; the
 * house rules for the shared layer are written against v8's API, and so is
 * the shadcn `table` registry this pairs with.
 */
export function useDataTable<TData extends RowData>({
  data,
  columns,
  sorting = [],
  getRowId,
}: UseDataTableOptions<TData>) {
  return useReactTable({
    data,
    columns,
    state: { sorting },
    manualPagination: true,
    manualSorting: true,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  })
}
