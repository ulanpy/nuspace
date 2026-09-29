import { useEffect, useMemo, useState } from "react"

import type { MyNuspaceSearch } from "@/routes/_app/mynuspace"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchUsersPage } from "@/lib/user"
import type { UserSummary } from "@/lib/user"
import { UserCard } from "@/components/routes/mynuspace/components/user-card"
import { useDebounced } from "@/hooks/use-debounced"
import { SearchFilter } from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { Page as PageLayout } from "@/components/shared/page"

/**
 * The public people directory.
 *
 * The communities list with the filters taken out: a user has no category and
 * no type, so the only thing to narrow a directory of people by is their name.
 * The server already hard-filters to pages that are public, so there is no
 * visibility filter here to forget about either.
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
  const { q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key, which restarts the infinite
  // list on every render.
  const filters = useMemo(() => ({ keyword: q }), [q])

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
      <SearchFilter
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Search people"
      />

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
              q
                ? "Nobody matches that search yet."
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
