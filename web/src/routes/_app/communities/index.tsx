import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchCommunitiesPage } from "@/features/communities/api"
import { CommunityCard } from "@/features/communities/components/community-card"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"

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
  /** Legacy /communities?id=123 links, rewritten to the path form below. */
  id: z.coerce.number().optional(),
})

export const Route = createFileRoute("/_app/communities/")({
  validateSearch: communitiesSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.id !== undefined) {
      throw redirect({
        to: "/communities/$communityId",
        params: { communityId: String(search.id) },
      })
    }
  },
  component: CommunitiesList,
})

function CommunitiesList() {
  const { category, type, q } = Route.useSearch()
  const filters = {
    community_category: category,
    community_type: type,
    keyword: q,
  }

  const list = useInfiniteList({
    queryKey: qk.communities.list(filters),
    fetchPage: (page) => fetchCommunitiesPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Communities</h1>
      </header>

      <InfiniteList
        items={list.items}
        getKey={(community) => community.id}
        renderItem={(community) => <CommunityCard community={community} />}
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        refetch={() => {
          void list.refetch()
        }}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        fetchNextPage={() => {
          void list.fetchNextPage()
        }}
        empty={
          <EmptyState
            title="No communities"
            description="Nothing matches these filters yet."
          />
        }
      >
        {(rendered) => (
          <div className="grid gap-4 sm:grid-cols-2">{rendered}</div>
        )}
      </InfiniteList>
    </div>
  )
}
