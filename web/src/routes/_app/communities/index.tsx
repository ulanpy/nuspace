import { useEffect, useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { z } from "zod"

import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchCommunitiesPage } from "@/features/communities/api"
import { CommunityCard } from "@/features/communities/components/community-card"
import { CommunityFormDialog } from "@/features/communities/components/community-form-dialog"
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_TYPES,
  type CommunityCategory,
  type CommunityType,
} from "@/features/communities/types"
import { useDebounced } from "@/hooks/use-debounced"
import {
  ChoiceChips,
  SearchFilter,
  type FilterOption,
} from "@/components/list-filters"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"

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
  const [search, setSearch] = useState(q ?? "")
  const debouncedSearch = useDebounced(search)
  const filters = {
    community_category: category,
    community_type: type,
    keyword: q,
  }

  const navigate = Route.useNavigate()
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setSearch(q ?? "")
  }, [q])

  useEffect(() => {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: debouncedSearch || undefined,
      }),
      replace: true,
    })
  }, [debouncedSearch, navigate])

  const list = useInfiniteList({
    queryKey: qk.communities.list(filters),
    fetchPage: (page) => fetchCommunitiesPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="Discover clubs, organizations, and campus groups."
        actions={
          // Open to any signed-in user, as on the server: creating a community
          // makes you its head, and admins verify it afterwards.
          <Button
            onClick={() => {
              setIsCreating(true)
            }}
          >
            <PlusIcon aria-hidden />
            Create community
          </Button>
        }
      />

      <div className="space-y-3">
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search communities"
        />
        <ChoiceChips
          label="Community category"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({ ...previous, category: next }),
            })
          }}
        />
        <ChoiceChips
          label="Community type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({ ...previous, type: next }),
            })
          }}
        />
      </div>

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
          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rendered}
          </div>
        )}
      </InfiniteList>

      <CommunityFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSaved={(community) => {
          void navigate({
            to: "/communities/$communityId",
            params: { communityId: String(community.id) },
          })
        }}
      />
    </div>
  )
}

const CATEGORY_OPTIONS = COMMUNITY_CATEGORIES.map((value) => ({
  value,
  label: titleCase(value),
})) satisfies FilterOption<CommunityCategory>[]

const TYPE_OPTIONS = COMMUNITY_TYPES.map((value) => ({
  value,
  label: titleCase(value),
})) satisfies FilterOption<CommunityType>[]

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
