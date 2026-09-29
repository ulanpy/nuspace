import { useEffect, useMemo, useState } from "react"

import type { MyNuspaceSearch } from "@/routes/_app/mynuspace"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchUsersPage } from "@/lib/user"
import type { UserSummary } from "@/lib/user"
import { UserCard } from "@/components/routes/mynuspace/components/user-card"
import { USER_CATEGORIES, type UserCategory } from "@/lib/user"
import { useDebounced } from "@/hooks/use-debounced"
import {
  FilterTabs,
  SearchFilter,
  type FilterOption,
} from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { Page as PageLayout } from "@/components/shared/page"

/**
 * The public people directory.
 *
 * The communities list with one filter instead of two: a person has no type,
 * but they do have a category, so that is the one row of tabs here. The server
 * already hard-filters to pages that are public, so there is no visibility
 * filter to forget about.
 */
export function Page({
  search,
  onSearchChange,
}: {
  search: MyNuspaceSearch
  onSearchChange: (
    updater: (previous: MyNuspaceSearch) => MyNuspaceSearch,
    replace?: boolean
  ) => void
}) {
  const { category, q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key, which restarts the infinite
  // list on every render.
  const filters = useMemo(() => ({ keyword: q, category }), [category, q])

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
    queryKey: qk.users.list(filters),
    fetchPage: (page) => fetchUsersPage(filters, page),
    // A user summary has no `id` — `sub` is the identity.
    getId: (user: UserSummary) => user.sub,
  })

  return (
    <PageLayout
      title="My Nuspace"
      description="Find people on campus and see the pages they have published."
    >
      <div className="flex flex-wrap items-center gap-2">
        <SearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search people"
        />
        <FilterTabs
          label="Category"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(next) => {
            onSearchChange((previous) => ({ ...previous, category: next }))
          }}
        />
      </div>

      <InfiniteList
        items={list.items}
        getKey={(user) => user.sub}
        renderItem={(user) => <UserCard user={user} />}
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
            title="No people"
            description={
              q || category
                ? "Nobody matches these filters yet."
                : "Nobody has published a page yet."
            }
          />
        }
      >
        {(rendered) => <CardGrid columns={3}>{rendered}</CardGrid>}
      </InfiniteList>
    </PageLayout>
  )
}

const CATEGORY_OPTIONS = USER_CATEGORIES.map((value) => ({
  value,
  label: value.charAt(0).toUpperCase() + value.slice(1),
})) satisfies FilterOption<UserCategory>[]
