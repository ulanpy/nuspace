import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/pages/settings/admin-controls"
import {
  DEFAULT_PAGE_SIZE,
  PAGE_ADMIN_SORTS,
  PAGE_SIZES,
} from "@/lib/pages/constants"
import { Route as SettingsRoute } from "../route"

const adminControlsSearchSchema = z.object({
  /**
   * Page of the admins table, 1-based.
   *
   * `.int().min(1)` before the catch is load-bearing: `?page=` coerces to
   * `0` (`Number("")`), which passes a bare `z.coerce.number()` and then asks
   * the API for page 0.
   */
  page: z.coerce.number().int().min(1).catch(1).default(1),
  /**
   * Rows per page. The footer's `Select` offers exactly `PAGE_SIZES`.
   *
   * The list is `readonly`, so the `as readonly number[]` here is the one
   * allowed narrowing — the alternative is a `Set` rebuilt per keystroke for a
   * five-element array.
   */
  size: z.coerce
    .number()
    .refine((value) => (PAGE_SIZES as readonly number[]).includes(value))
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  /** Which column, and which way. `undefined` leaves the backend's own order. */
  sort: z.enum(PAGE_ADMIN_SORTS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
})

export type AdminControlsSearch = z.infer<typeof adminControlsSearchSchema>

export const Route = createFileRoute("/_app/p/$slug/settings/admin-controls/")({
  validateSearch: adminControlsSearchSchema,
  component: PageSettingsAdminControlsRoute,
})

function PageSettingsAdminControlsRoute() {
  const { page } = SettingsRoute.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: AdminControlsSearch) => AdminControlsSearch) => {
      void navigate({ search: updater })
    },
    [navigate]
  )

  return <Page page={page} search={search} onSearchChange={onSearchChange} />
}
