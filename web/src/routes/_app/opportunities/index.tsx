import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/opportunities"
import {
  EDUCATION_LEVELS,
  OPPORTUNITY_MAJORS,
  OPPORTUNITY_TYPES,
} from "@/lib/opportunities"

const opportunitiesSearchSchema = z.object({
  type: z.array(z.enum(OPPORTUNITY_TYPES)).optional(),
  majors: z.array(z.enum(OPPORTUNITY_MAJORS)).optional(),
  education: z.array(z.enum(EDUCATION_LEVELS)).optional(),
  years: z.array(z.coerce.number()).optional(),
  hideExpired: z.boolean().default(true),
  q: z.string().optional(),
})

export type OpportunitiesSearch = z.infer<typeof opportunitiesSearchSchema>

export const Route = createFileRoute("/_app/opportunities/")({
  validateSearch: opportunitiesSearchSchema,
  component: OpportunitiesRoute,
})

function OpportunitiesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: OpportunitiesSearch) => OpportunitiesSearch,
      replace = false
    ) => {
      void navigate({
        search: updater,
        replace,
      })
    },
    [navigate]
  )

  return <Page search={search} onSearchChange={onSearchChange} />
}
