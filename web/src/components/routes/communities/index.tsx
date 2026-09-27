import { useEffect, useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"

import type { CommunitiesSearch } from "@/routes/_app/communities"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchCommunitiesPage } from "@/lib/communities"
import { CommunityCard } from "@/components/routes/communities/components/community-card"
import { CommunityFormDialog } from "@/components/routes/communities/components/community-form-dialog"
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_TYPES,
  type CommunityCategory,
  type CommunityType,
} from "@/lib/communities"
import { useDebounced } from "@/hooks/use-debounced"
import {
  ChoiceChips,
  FilterBar,
  SearchFilter,
  type FilterOption,
} from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { PageContainer } from "@/components/shared/page/container"
import { PageHeader } from "@/components/shared/page/header"
import { Button } from "@/components/ui/button"

export function Page({
  search,
  onSearchChange,
  onCommunityCreated,
}: {
  search: CommunitiesSearch
  onSearchChange: (
    updater: (previous: CommunitiesSearch) => CommunitiesSearch,
    replace?: boolean
  ) => void
  onCommunityCreated: (slug: string) => void
}) {
  const { category, type, q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // The range contains derived values, so memoising keeps a stable query key —
  // a fresh object per render restarts the infinite query.
  const filters = useMemo(
    () => ({
      community_category: category,
      community_type: type,
      keyword: q,
    }),
    [category, type, q]
  )

  const [isCreating, setIsCreating] = useState(false)

  const [previousQuery, setPreviousQuery] = useState(q)
  if (previousQuery !== q) {
    setPreviousQuery(q)
    setSearchInput(q ?? "")
  }

  useEffect(() => {
    onSearchChange(
      (previous) => ({
        ...previous,
        q: debouncedSearch || undefined,
      }),
      true
    )
  }, [debouncedSearch, onSearchChange])

  const list = useInfiniteList({
    queryKey: qk.communities.list(filters),
    fetchPage: (page) => fetchCommunitiesPage(filters, page),
  })

  return (
    <PageContainer maxWidth="wide" className="space-y-6">
      <PageHeader
        title="Communities"
        description="Discover clubs, organizations, and campus groups."
        actions={
          // Open to any signed-in user, as on the server: creating a community
          // makes you its owner, and admins verify it afterwards.
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

      <FilterBar>
        <SearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search communities"
        />
        <ChoiceChips
          label="Community category"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(next) => {
            onSearchChange((previous) => ({ ...previous, category: next }))
          }}
        />
        <ChoiceChips
          label="Community type"
          value={type}
          options={TYPE_OPTIONS}
          onChange={(next) => {
            onSearchChange((previous) => ({ ...previous, type: next }))
          }}
        />
      </FilterBar>

      <InfiniteList
        items={list.items}
        getKey={(community) => community.id}
        renderItem={(community) => <CommunityCard community={community} />}
        isPending={list.isPending}
        pending={<CardGridSkeleton columns={3} />}
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
        {(rendered) => <CardGrid columns={3}>{rendered}</CardGrid>}
      </InfiniteList>

      <CommunityFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSaved={(community) => {
          onCommunityCreated(community.slug)
        }}
      />
    </PageContainer>
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
