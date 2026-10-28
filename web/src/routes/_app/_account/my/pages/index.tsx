import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { SignInGate } from "@/components/layouts/account/sign-in-gate"
import { MyPagesScreen } from "@/components/routes/my/pages"
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  PAGE_VISIBILITY_VALUES,
} from "@/lib/pages/constants"

const myPagesSearchSchema = z.object({
  /**
   * Page of the list, 1-based.
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
  /** One value, not a list: the backend's filter takes a single `PageRole`. */
  role: z.enum(["owner", "admin"]).optional(),
  visibility: z.array(z.enum(PAGE_VISIBILITY_VALUES)).optional(),
})

export type MyPagesSearch = z.infer<typeof myPagesSearchSchema>

export const Route = createFileRoute("/_app/_account/my/pages/")({
  validateSearch: myPagesSearchSchema,
  component: MyPagesRoute,
})

function MyPagesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (updater: (previous: MyPagesSearch) => MyPagesSearch) => {
      // Pushed, not replaced: a filter or a page is a history entry, so Back
      // walks the reader out of the list the way it walked them in.
      void navigate({ search: updater })
    },
    [navigate]
  )

  return (
    <SignInGate>
      <MyPagesScreen
        search={search}
        onSearchChange={onSearchChange}
        onPageCreated={(slug) => {
          // Straight to the Page they just made. Leaving them on a list that
          // now has one more card they have to find is worse.
          void navigate({ to: "/pages/$slug", params: { slug } })
        }}
      />
    </SignInGate>
  )
}
