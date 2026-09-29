import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import type { Column } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

/**
 * A header cell that is a button when its column is sortable, and plain text
 * when it is not.
 *
 * `column.getCanSort()` is the single gate: a column that was not given
 * `enableSorting` renders as text with no affordance, which is the honest
 * answer for a column the backend cannot sort. A greyed-out chevron would
 * advertise a sort that silently does nothing.
 *
 * Note what is *not* here: `aria-sort`. It belongs to the `columnheader`
 * role, which is the `<th>` — not the button inside it — so `DataTable` sets it
 * from `column.getIsSorted()` where the `<th>` is. `getIsSorted()` returning
 * `false` for unsorted and `"asc"`/`"desc"` otherwise is why the two states
 * need different handling, and putting it on the button would both be invalid
 * and collapse that distinction.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 gap-1.5", className)}
      onClick={column.getToggleSortingHandler()}
      aria-label={
        sorted === "asc"
          ? `Sort ${title} descending`
          : `Sort ${title} ascending`
      }
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUpIcon aria-hidden className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDownIcon aria-hidden className="size-3.5" />
      ) : (
        <ArrowUpDownIcon aria-hidden className="size-3.5 opacity-50" />
      )}
    </Button>
  )
}
