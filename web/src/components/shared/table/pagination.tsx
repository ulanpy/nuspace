import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface TablePaginationProps {
  /** 1-based, from the URL rather than component state. */
  page: number
  totalPages: number
  hasNext: boolean
  /** "Showing 11–20 of 84", or null before the first response. */
  summary: string | null
  isFetching: boolean
  /** Greyed out while a page is still in flight, so pages cannot be skipped. */
  disabled?: boolean
  onPageChange: (page: number) => void
  /**
   * Rows per page, and the change handler. Both omitted on a table that does
   * not offer the choice.
   *
   * The allowed values are not here: they come from the route's own
   * `validateSearch` and its `constants.ts`, and this component is handed
   * whatever that route accepts. A literal list in a component is a second
   * source of truth for a validation rule the server already enforces, and the
   * two drift the first time a route adds a size.
   */
  pageSize?: number
  pageSizeOptions?: readonly number[]
  onPageSizeChange?: (size: number) => void
}

/**
 * The page-of-N footer under a paginated table.
 *
 * Both paginated areas in the app — the community admins table and the public
 * user directory — read their page from the URL and get the same envelope back,
 * so the footer is one component with the numbers passed in rather than sixty
 * lines of markup copied a second time.
 */
export function TablePagination({
  page,
  totalPages,
  hasNext,
  summary,
  isFetching,
  disabled = false,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: TablePaginationProps) {
  const isFirst = page <= 1
  const isLast = !hasNext

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {summary}
        {isFetching ? <span className="ml-2">Updating…</span> : null}
      </p>

      <div className="flex w-full items-center justify-center gap-4 sm:w-fit sm:justify-end">
        {pageSizeOptions && onPageSizeChange ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows</span>
            <Select
              // The URL owns the size, so a reload or a shared link keeps it.
              // Keyed on the value so a change re-renders Base UI's label.
              value={String(pageSize)}
              onValueChange={(next) => onPageSizeChange(Number(next))}
            >
              <SelectTrigger
                size="sm"
                className="w-20"
                aria-label="Rows per page"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <span className="text-sm font-medium">
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="hidden lg:flex"
            onClick={() => onPageChange(1)}
            disabled={isFirst || disabled}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeftIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={isFirst || disabled}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeftIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={isLast || disabled}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRightIcon aria-hidden />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden lg:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={isLast || disabled}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRightIcon aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
