import { useEffect, useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import type { PeopleSearch } from "@/routes/_app/_account/my/index"
import { qk } from "@/api/query-keys"
import { useDebounced } from "@/hooks/use-debounced"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { useSession } from "@/hooks/use-session"
import { fetchProfiles } from "@/lib/profiles"
import { SearchFilter } from "@/components/shared/list-filters"
import { Page } from "@/components/shared/page"
import { PageCard } from "@/components/shared/page/card"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { Button } from "@/components/ui/button"

interface PeopleProps {
  search: PeopleSearch
  onSearchChange: (
    updater: (previous: PeopleSearch) => PeopleSearch,
    replace?: boolean
  ) => void
}

/**
 * The people directory, at `my.nuspace.kz/`: a grid of the profile pages the
 * viewer may open, the same card the Pages directory uses.
 *
 * Open to everyone. Who is in the grid, and the count behind it, is the
 * server's: anonymous visitors get `public` profiles, members `internal` too.
 */
export function PeopleDirectoryScreen({ search, onSearchChange }: PeopleProps) {
  const session = useSession()
  const { q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key, which restarts the list.
  const filters = useMemo(() => ({ keyword: q }), [q])

  // Back and forward change `q` under the field; follow them.
  const [previousQuery, setPreviousQuery] = useState(q)
  if (previousQuery !== q) {
    setPreviousQuery(q)
    setSearchInput(q ?? "")
  }

  useEffect(() => {
    onSearchChange(
      (previous) => ({ ...previous, q: debouncedSearch || undefined }),
      true
    )
  }, [debouncedSearch, onSearchChange])

  const list = useInfiniteList({
    queryKey: qk.profiles.list(filters),
    fetchPage: (page) => fetchProfiles(filters, page),
    getId: (person) => person.handle,
  })

  return (
    <Page
      title="People"
      actions={
        session ? (
          <Button
            variant="secondary"
            nativeButton={false}
            render={
              <Link to="/my/profile">
                <ChevronRightIcon aria-hidden />
                My Profile
              </Link>
            }
          />
        ) : null
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <SearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, handle or department"
          label="Search these profiles"
        />
      </div>

      <InfiniteList
        items={list.items}
        getKey={(person) => person.handle}
        renderItem={(person) => (
          <PageCard
            name={`${person.name} ${person.surname}`}
            description={person.department}
            avatar={person.picture}
            link={{ to: "/my/u/$handle", params: { handle: person.handle } }}
          />
        )}
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
            title="No profiles"
            description={
              q
                ? `Nothing here matches "${q}".`
                : "No profile you can open is listed yet."
            }
          />
        }
      >
        {(rendered) => <CardGrid columns={3}>{rendered}</CardGrid>}
      </InfiniteList>
    </Page>
  )
}
