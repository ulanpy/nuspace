import { useLocation } from "@tanstack/react-router"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { pageNumbers } from "./page-numbers"

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
}

/**
 * The current address with `?page=` set to `next`, as a relative href.
 *
 * Each number is a real link, not a button, so middle-click and
 * open-in-new-tab work and the browser's status bar shows where a page leads.
 * Derived from `location.href` rather than assembled from the pathname, so the
 * other search params — `role` on My Pages — survive a page change without this
 * component knowing their names.
 */
function usePageHref() {
  const location = useLocation()

  return (next: number) => {
    const url = new URL(location.href)
    url.searchParams.set("page", String(next))
    return `${url.pathname}${url.search}`
  }
}

/**
 * The page-of-N footer under a paginated table.
 *
 * Numbered links on the `ui/pagination` primitives, so a page is one click away
 * instead of a walk with the arrows. The numbers come from `pageNumbers`, which
 * is tested on its own: the arithmetic is the fiddly part and the markup
 * around it is not.
 *
 * One component for both paginated areas — the page admins table and My Pages —
 * because they read their page from the URL and get the same envelope back.
 */
export function TablePagination({
  page,
  totalPages,
  hasNext,
  summary,
  isFetching,
  disabled = false,
  onPageChange,
}: TablePaginationProps) {
  const isFirst = page <= 1
  const isLast = !hasNext
  const href = usePageHref()

  // A single page needs no controls. "Page 1 of 1" between two dead arrows is
  // noise, and a short table is the common case.
  if (totalPages <= 1) {
    return summary ? (
      <p className="text-sm text-muted-foreground">{summary}</p>
    ) : null
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        {summary}
        {isFetching ? <span className="ml-2">Updating…</span> : null}
      </p>

      <Pagination className="mx-0 w-fit sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={href(Math.max(page - 1, 1))}
              aria-disabled={isFirst || disabled}
              className={
                isFirst || disabled
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              onClick={(event) => {
                // The anchor's href is the real navigation; the handler only
                // exists to stop the full page load the router would do anyway.
                event.preventDefault()
                if (!isFirst && !disabled) onPageChange(page - 1)
              }}
            />
          </PaginationItem>

          {pageNumbers(page, totalPages).map((entry, index) =>
            entry === "…" ? (
              // Keyed by index: an ellipsis has no identity of its own, and a
              // long table has two of them in one row.
              <PaginationItem key={`gap-${String(index)}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={entry}>
                <PaginationLink
                  href={href(entry)}
                  isActive={entry === page}
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(entry)
                  }}
                >
                  {String(entry)}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            <PaginationNext
              href={href(Math.min(page + 1, totalPages))}
              aria-disabled={isLast || disabled}
              className={
                isLast || disabled
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault()
                if (!isLast && !disabled) onPageChange(page + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
