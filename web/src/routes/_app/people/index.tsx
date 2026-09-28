import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/people"

const peopleSearchSchema = z.object({
  q: z.string().optional(),
})

export type PeopleSearch = z.infer<typeof peopleSearchSchema>

export const Route = createFileRoute("/_app/people/")({
  validateSearch: peopleSearchSchema,
  component: PeopleListRoute,
})

function PeopleListRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: PeopleSearch) => PeopleSearch,
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
