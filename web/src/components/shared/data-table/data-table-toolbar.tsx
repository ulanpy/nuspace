import { cn } from "@/lib/utils"

interface DataTableToolbarProps {
  /** The filters and the create button, laid out by the caller. */
  children: React.ReactNode
  /**
   * Rendered above the filters when rows are selected, replacing them.
   *
   * A selection bar that appears *below* the filters is the usual arrangement
   * and the wrong one: the thing the user is about to do to these rows is
   * below the thing they just used to choose them, and the two fight for the
   * same row of pixels.
   */
  selectionActions?: React.ReactNode
  selectedCount?: number
  className?: string
}

/**
 * The row above a table: filters on the left, actions on the right, and the
 * selection bar when there is a selection.
 *
 * The `table` argument is deliberately absent. shadcn's version takes the table
 * so it can read the selection itself, but every action here acts on rows the
 * *caller* owns — the component that fetched the rows is the only one that
 * knows how to invalidate them. Passing the table in would invite a toolbar to
 * act on rows it cannot refetch.
 */
export function DataTableToolbar({
  children,
  selectionActions,
  selectedCount = 0,
  className,
}: DataTableToolbarProps) {
  if (selectedCount > 0 && selectionActions) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 p-2",
          className
        )}
      >
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selectionActions}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  )
}
