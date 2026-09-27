import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/communities/settings/admin-controls"
import { Route as SettingsRoute } from "../route"

const adminControlsSearchSchema = z.object({
  /**
   * Page of the admins table, 1-based.
   *
   * `.int().min(1)` before the catch is load-bearing: `?page=` coerces to `0`
   * (`Number("")`), which passes a bare `z.coerce.number()` and then asks the
   * API for page 0.
   */
  page: z.coerce.number().int().min(1).catch(1).default(1),
})

export type AdminControlsSearch = z.infer<typeof adminControlsSearchSchema>

export const Route = createFileRoute(
  "/_app/communities/$slug/settings/admin-controls/"
)({
  validateSearch: adminControlsSearchSchema,
  component: CommunitySettingsAdminControlsRoute,
})

function CommunitySettingsAdminControlsRoute() {
  const { community } = SettingsRoute.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: AdminControlsSearch) => AdminControlsSearch) => {
      void navigate({ search: updater })
    },
    [navigate]
  )

  return (
    <Page
      community={community}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}
