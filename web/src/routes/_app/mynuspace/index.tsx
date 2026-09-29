import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/mynuspace"

const myNuspaceSearchSchema = z.object({
  q: z.string().optional(),
})

export type MyNuspaceSearch = z.infer<typeof myNuspaceSearchSchema>

export const Route = createFileRoute("/_app/mynuspace/")({
  validateSearch: myNuspaceSearchSchema,
  component: MyNuspaceRoute,
})

function MyNuspaceRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: MyNuspaceSearch) => MyNuspaceSearch,
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
