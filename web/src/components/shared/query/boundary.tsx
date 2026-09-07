import type { ReactNode } from "react"
import type { UseQueryResult } from "@tanstack/react-query"
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react"

import { ApiError } from "@/api/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * One place that renders loading, error and empty states for a query.
 *
 * The old app handled these three ways: a shared QueryBoundary in some places,
 * a bespoke inline animate-pulse skeleton in others, and a bare
 * `<p>Loading messages...</p>` with no retry in the worst ones. Route them all
 * through here so the app behaves consistently when the network does not.
 */
interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  /** Shown while loading. Defaults to generic skeleton lines. */
  pending?: ReactNode
  /** Rendered instead of children when the result is empty. */
  empty?: ReactNode
  /** Decides emptiness; defaults to empty arrays. */
  isEmpty?: (data: T) => boolean
}

export function QueryBoundary<T>({
  query,
  children,
  pending,
  empty,
  isEmpty = defaultIsEmpty,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return pending ?? <SkeletonLines />
  }

  if (query.isError) {
    return (
      <QueryError
        error={query.error}
        onRetry={() => {
          void query.refetch()
        }}
      />
    )
  }

  if (empty && isEmpty(query.data)) {
    return empty
  }

  return children(query.data)
}

function defaultIsEmpty(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0
}

export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  )
}

export function QueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center"
    >
      <AlertTriangleIcon className="size-6 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{describeError(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCwIcon className="size-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isForbidden) return "You do not have access to this."
    if (error.status === 404) return "This no longer exists."
    if (error.status >= 500) return "The server is having trouble right now."
    return typeof error.detail === "string" ? error.detail : error.message
  }
  return "Check your connection and try again."
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
