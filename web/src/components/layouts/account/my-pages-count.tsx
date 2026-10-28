import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { myPagesQueryOptions } from "@/lib/pages"

/**
 * How many Pages the viewer owns or administers, on the My Pages row of the
 * rail. Nothing while it loads, and nothing at zero.
 */
export function MyPagesCount() {
  const { data } = useQuery(myPagesQueryOptions({ page: 1, size: 1 }))

  if (!data || data.total === 0) return null
  return (
    <Badge variant="secondary" aria-label={`${String(data.total)} pages`}>
      {data.total}
    </Badge>
  )
}
