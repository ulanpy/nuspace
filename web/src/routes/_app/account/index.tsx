import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/account"

const accountSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  role: z.enum(["owned", "admin"]).optional(),
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
