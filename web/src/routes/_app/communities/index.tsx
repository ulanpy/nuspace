import { createFileRoute } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/communities"

const communitiesSearchSchema = z.object({
  category: z
    .enum([
      "academic",
      "professional",
      "recreational",
      "cultural",
      "sports",
      "social",
      "art",
    ])
    .optional(),
  type: z.enum(["club", "university", "organization"]).optional(),
  q: z.string().optional(),
})

export type CommunitiesSearch = z.infer<typeof communitiesSearchSchema>

export const Route = createFileRoute("/_app/communities/")({
  validateSearch: communitiesSearchSchema,
  component: CommunitiesListRoute,
})

function CommunitiesListRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: CommunitiesSearch) => CommunitiesSearch,
      replace = false
    ) => {
      void navigate({
        search: updater,
        replace,
      })
    },
    [navigate]
  )

  return (
    <Page
      search={search}
      onSearchChange={onSearchChange}
      onCommunityCreated={(slug) => {
        void navigate({
          to: "/communities/$slug",
          params: { slug },
        })
      }}
    />
  )
}
