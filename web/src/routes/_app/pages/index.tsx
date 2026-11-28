import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { PagesDirectoryScreen } from "@/components/routes/pages"

const pagesDirectorySearchSchema = z.object({
  q: z.string().optional(),
})

export type PagesDirectorySearch = z.infer<typeof pagesDirectorySearchSchema>

/** `pages.nuspace.kz/`: the Pages directory. */
export const Route = createFileRoute("/_app/pages/")({
  validateSearch: pagesDirectorySearchSchema,
  component: PagesDirectoryRoute,
})

function PagesDirectoryRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: PagesDirectorySearch) => PagesDirectorySearch,
      replace = false
    ) => {
      void navigate({ search: updater, replace })
    },
    [navigate]
  )

  return (
    <PagesDirectoryScreen search={search} onSearchChange={onSearchChange} />
  )
}
