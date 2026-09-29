import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/account"
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PAGE_SORTS,
  PAGE_VISIBILITY_VALUES,
} from "@/lib/pages/constants"

const accountSearchSchema = z.object({
  /**
   * Page of the My Pages table, 1-based.
   *
   * `.int().min(1)` before the catch is load-bearing: `?page=` coerces to `0`
   * (`Number("")`), which passes a bare `z.coerce.number()` and then asks the
   * API for page 0.
   */
  page: z.coerce.number().int().min(1).catch(1).default(1),
  /** Rows per page. The footer's `Select` offers exactly `PAGE_SIZES`. */
  size: z.coerce
    .number()
    .refine((value) => (PAGE_SIZES as readonly number[]).includes(value))
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
  /**
   * `role` is one value, not a list: the backend's filter takes a single
   * `PageRole`. `visibility` is a list, and the `z.array(z.enum(...))` shape is
   * the one already used by the opportunities and courses routes — do not
   * invent a second URL encoding for it.
   */
  role: z.enum(["owner", "admin"]).optional(),
  visibility: z.array(z.enum(PAGE_VISIBILITY_VALUES)).optional(),
  /** Which column, and which way. `undefined` leaves the backend's own order. */
  sort: z.enum(PAGE_SORTS).optional(),
  order: z.enum(["asc", "desc"]).optional(),
})

export type AccountSearch = z.infer<typeof accountSearchSchema>

export const Route = createFileRoute("/_app/account/")({
  validateSearch: accountSearchSchema,
  component: AccountRoute,
})

function AccountRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: AccountSearch) => AccountSearch, replace = false) => {
      void navigate({
        search: updater,
        replace,
      })
    },
    [navigate]
  )

  return <Page search={search} onSearchChange={onSearchChange} />
}
