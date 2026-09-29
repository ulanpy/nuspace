import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/u/$slug/settings/communities"

const myCommunitiesSearchSchema = z.object({
  /**
   * Page of the community list, 1-based.
   *
   * `.int().min(1)` before the catch is load-bearing: `?page=` coerces to `0`
   * (`Number("")`), which passes a bare `z.coerce.number()` and then asks the
   * API for page 0.
   */
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type MyCommunitiesSearch = z.infer<typeof myCommunitiesSearchSchema>

export const Route = createFileRoute("/_app/u/$slug/settings/communities/")({
  validateSearch: myCommunitiesSearchSchema,
  component: MyCommunitiesRoute,
})

function MyCommunitiesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onPageChange = useCallback(
    (page: number) => {
      void navigate({ search: { page } })
    },
    [navigate]
  )

  return <Page search={search} onPageChange={onPageChange} />
}
