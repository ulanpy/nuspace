import { flexRender, type Table as TableType } from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

export interface DataTableProps<TData> {
  table: TableType<TData>
  /** Shown instead of the rows while the next page is in flight. */
  isLoading?: boolean
  /** How many placeholder rows to draw while loading. */
  skeletonRows?: number
  /** Receives the table, so the caller can render a toolbar above it. */
  toolbar?: (table: TableType<TData>) => React.ReactNode
  /** The "no rows" row. Both tables need their own copy. */
  emptyState: React.ReactNode
}

/**
 * `Table` over a react-table instance, plus the two states that are not rows.
 *
 * Column widths come from react-table's own layout measurement rather than a
 * `colgroup`: the table is `w-full`, and pinning widths here is how a
 * six-column table ends up with a name column two characters wide and an
 * actions column half the viewport.
 */
export function DataTable<TData>({
  table,
  isLoading = false,
  skeletonRows = 5,
  toolbar,
  emptyState,
}: DataTableProps<TData>) {
  const columnCount = table.getVisibleLeafColumns().length

  return (
    <div className="flex flex-col gap-4">
      {toolbar?.(table)}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  // `aria-sort` lives on the `columnheader` role, which is this
                  // `<th>` and not the button inside it. `getIsSorted()` is
                  // `false` when unsorted, so the three states are not the same
                  // value and cannot collapse into one truthy check.
                  aria-sort={
                    header.column.getCanSort()
                      ? header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                      : undefined
                  }
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <DataTableSkeleton columns={columnCount} rows={skeletonRows} />
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              {/* Spans the table so the empty state is one cell, not N. */}
              <TableCell colSpan={columnCount} className="h-32 text-center">
                {emptyState}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/** The rows-as-skeletons state, for callers that render their own `<Table>`. */
export function DataTableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number
  rows?: number
}) {
  return Array.from({ length: rows }, (_, row) => (
    <TableRow key={`skeleton-${row}`}>
      {Array.from({ length: columns }, (__, column) => (
        <TableCell key={`skeleton-${column}`}>
          <Skeleton className="h-4 w-full" />
        </TableCell>
      ))}
    </TableRow>
  ))
}
