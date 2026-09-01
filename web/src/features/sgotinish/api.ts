import { queryOptions } from "@tanstack/react-query"

import { api, unwrap } from "@/api/client"
import { qk } from "@/api/query-keys"
import type { components } from "@/api/schema"

/** Public, aggregate Student Government appeal statistics. */
export type OtinishPublicStats = components["schemas"]["OtinishPublicStats"]

/**
 * The only SGotinish endpoint on dev: a public stats rollup. Appeals themselves
 * live in Telegram (nuspacebot), so there are no tickets, conversations, or
 * delegation here to query.
 */
export function sgotinishStatsQueryOptions() {
  return queryOptions({
    queryKey: qk.sgotinish.stats(),
    queryFn: () => unwrap(api.GET("/sgotinish/stats")),
    staleTime: 60_000,
  })
}
