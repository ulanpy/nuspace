import type { ReactNode } from "react"
import { Loader2Icon } from "lucide-react"

import { useIntersection } from "@/hooks/use-intersection"
import { QueryError, SkeletonLines } from "@/components/query-boundary"

interface InfiniteListProps<T> {
  items: T[]
  renderItem: (item: T) => ReactNode
  getKey: (item: T) => string | number
  isPending: boolean
  isError: boolean
  error?: unknown
  refetch?: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  empty?: ReactNode
  /** Wrapper around the rendered items; defaults to a vertical stack. */
  children?: (rendered: ReactNode[]) => ReactNode
}

export function InfiniteList<T>({
  items,
  renderItem,
  getKey,
  isPending,
  isError,
  error,
  refetch,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  empty,
  children,
}: InfiniteListProps<T>) {
  const sentinelRef = useIntersection<HTMLDivElement>(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage()
    },
    { enabled: hasNextPage && !isFetchingNextPage }
  )

  if (isPending) return <SkeletonLines count={4} />
  if (isError) return <QueryError error={error} onRetry={refetch} />
  if (items.length === 0 && empty) return empty

  const rendered = items.map((item) => (
    <div key={getKey(item)}>{renderItem(item)}</div>
  ))

  return (
    <>
      {children ? (
        children(rendered)
      ) : (
        <div className="space-y-3">{rendered}</div>
      )}

      {/* Sentinel sits after the list so observing it means "reached the end". */}
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {isFetchingNextPage && (
        <output className="flex justify-center py-6" aria-label="Loading more">
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        </output>
      )}
    </>
  )
}
