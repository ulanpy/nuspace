import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { ApiError } from "@/api/client"
import { PageSettingsScreen } from "@/components/routes/pages/settings"
import { pageDetailQueryOptions } from "@/lib/pages"
import {
  DEFAULT_PAGE_SIZE,
  PAGE_ADMIN_SORTS,
  PAGE_SETTINGS_TABS,
  PAGE_SIZES,
} from "@/lib/pages/constants"

const pageSettingsSearchSchema = z.object({
  /**
   * Which section. One route with a `tab` rather than a child route per
   * section: the host serves `/<slug>/settings` and nothing below it.
   */
  tab: z.enum(PAGE_SETTINGS_TABS).catch("general").default("general"),
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

export type PageSettingsSearch = z.infer<typeof pageSettingsSearchSchema>

/** `pages.nuspace.kz/<slug>/settings`: details, visibility and admins. */
export const Route = createFileRoute("/_app/pages/$slug/settings/")({
  validateSearch: pageSettingsSearchSchema,
  loader: async ({ context, params }) => {
    let page
    try {
      page = await context.queryClient.ensureQueryData(
        pageDetailQueryOptions(params.slug)
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound()
      throw error
    }

    // Anyone who can edit may hold settings, which includes a page admin and
    // not just the owner. Everyone else has no business on either tab.
    if (!page.permissions.can_edit) {
      throw redirect({ to: "/pages/$slug", params: { slug: params.slug } })
    }

    return { page }
  },
  component: PageSettingsRoute,
})

function PageSettingsRoute() {
  const { page } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: PageSettingsSearch) => PageSettingsSearch) => {
      void navigate({ search: updater })
    },
    [navigate]
  )

  return (
    <PageSettingsScreen
      page={page}
      search={search}
      onSearchChange={onSearchChange}
    />
  )
}
