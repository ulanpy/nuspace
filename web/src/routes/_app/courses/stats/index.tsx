import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/shared/page"

import { StatisticsScreen } from "@/components/routes/courses/statistics"

const statisticsSearchSchema = z.object({
  q: z.string().optional(),
  /** A term code like `FA2025`; absent means every term. */
  term: z.string().optional(),
})

export type StatisticsSearch = z.infer<typeof statisticsSearchSchema>

export const Route = createFileRoute("/_app/courses/stats/")({
  validateSearch: statisticsSearchSchema,
  component: StatisticsRoute,
})

function StatisticsRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: StatisticsSearch) => StatisticsSearch,
      replace = false
    ) => {
      void navigate({
        search: updater,
        replace,
      })
    },
    [navigate]
  )

  return (
    <Page title="Statistics">
      <StatisticsScreen search={search} onSearchChange={onSearchChange} />
    </Page>
  )
}
