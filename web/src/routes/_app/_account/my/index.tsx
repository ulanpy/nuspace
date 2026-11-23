import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { PeopleDirectoryScreen } from "@/components/routes/my/people"

const peopleSearchSchema = z.object({
  q: z.string().optional(),
})

export type PeopleSearch = z.infer<typeof peopleSearchSchema>

/** `my.nuspace.kz/`: the people directory. Open to everyone, signed in or not. */
export const Route = createFileRoute("/_app/_account/my/")({
  validateSearch: peopleSearchSchema,
  component: PeopleDirectoryRoute,
})

function PeopleDirectoryRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: PeopleSearch) => PeopleSearch,
      replace = false
    ) => {
      void navigate({ search: updater, replace })
    },
    [navigate]
  )

  return (
    <PeopleDirectoryScreen search={search} onSearchChange={onSearchChange} />
  )
}
