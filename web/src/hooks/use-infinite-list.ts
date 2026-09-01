import { useMemo } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

/**
 * The pagination envelope every list endpoint returns — ListEventResponse,
 * ListCommunity, ListTicketDTO and the rest are all this shape.
 *
 * `items` is optional because the backend gives it a default, so it can be
 * absent rather than an empty array.
 */
export interface Paginated<T> {
  items?: T[]
  total: number
  page: number
  size: number
  total_pages: number
  has_next: boolean
}

interface UseInfiniteListOptions<T> {
  queryKey: readonly unknown[]
  fetchPage: (params: { page: number; size: number }) => Promise<Paginated<T>>
  size?: number
  enabled?: boolean
  /**
   * Identity for de-duplication. Pages are fetched at different moments, so a
   * row inserted between requests can shift items across page boundaries and
   * arrive twice — which React would then flag as a duplicate key.
   */
  getId?: (item: T) => string | number
}

const defaultGetId = (item: unknown): string | number | undefined => {
  if (typeof item !== "object" || item === null || !("id" in item)) {
    return undefined
  }
  const id: unknown = item.id
  return typeof id === "string" || typeof id === "number" ? id : undefined
}

/**
 * One infinite-list implementation for every paginated endpoint. The old app
 * had three near-duplicate list components, one of which was never imported
 * and none of which were actually virtualized despite the naming.
 */
export function useInfiniteList<T>({
  queryKey,
  fetchPage,
  size = 20,
  enabled = true,
  getId,
}: UseInfiniteListOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage({ page: pageParam, size }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.has_next ? lastPage.page + 1 : undefined,
    enabled,
  })

  const items = useMemo(() => {
    const flat = query.data?.pages.flatMap((page) => page.items ?? []) ?? []
    const identify = getId ?? defaultGetId

    const seen = new Set<string | number>()
    return flat.filter((item) => {
      const id = identify(item)
      if (id === undefined) return true
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
  }, [query.data, getId])

  return {
    ...query,
    items,
    total: query.data?.pages[0]?.total ?? 0,
    isEmpty: !query.isPending && items.length === 0,
  }
}
