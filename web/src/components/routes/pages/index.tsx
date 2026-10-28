import { useEffect, useMemo, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { LogInIcon, PlusIcon } from "lucide-react"

import type { PagesDirectorySearch } from "@/routes/_app/pages"
import { qk } from "@/api/query-keys"
import { useDebounced } from "@/hooks/use-debounced"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { useSession } from "@/hooks/use-session"
import { fetchBrowsablePages } from "@/lib/pages"
import { currentBrowserPath, loginHref } from "@/lib/user"
import { PageCard } from "@/components/routes/pages/components/page-card"
import { SearchFilter } from "@/components/shared/list-filters"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

interface DirectoryProps {
  search: PagesDirectorySearch
  onSearchChange: (
    updater: (previous: PagesDirectorySearch) => PagesDirectorySearch,
    replace?: boolean
  ) => void
}

/**
 * The Pages directory, at `pages.nuspace.kz/`: a grid of the Pages the viewer
 * may read, behind an access wall for anyone signed out.
 */
export function PagesDirectoryScreen({
  search,
  onSearchChange,
}: DirectoryProps) {
  const session = useSession()

  return (
    <Page
      title="Pages"
      description="Clubs, organizations and campus groups."
      actions={
        session ? (
          // Creating a Page lives with the Pages you manage, at
          // `my.nuspace.kz/pages`; the host rewrite takes the link there.
          <Button
            nativeButton={false}
            render={
              <Link to="/my/pages">
                <PlusIcon aria-hidden />
                Create page
              </Link>
            }
          />
        ) : null
      }
    >
      {session ? (
        <Directory search={search} onSearchChange={onSearchChange} />
      ) : (
        <AccessWall />
      )}
    </Page>
  )
}

/**
 * What a signed-out visitor sees instead of the grid. The sign-in is the one
 * Nuspace sign-in, shared by every host, so it says so: someone who signed in
 * on another Nuspace site is already signed in here.
 */
function AccessWall() {
  // Re-render on navigation, so the link always carries the current path.
  useRouterState({ select: (state) => state.location.href })

  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyTitle>Sign in to browse Pages</EmptyTitle>
        <EmptyDescription>
          The directory is for Nuspace members. One Nuspace sign-in covers every
          Nuspace site: search, courses, events, opportunities, Pages and your
          account. Sign in once, with your NU account, and you are signed in
          everywhere.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <PageAction
          icon={LogInIcon}
          href={loginHref({
            returnTo: currentBrowserPath(window.location),
            origin: window.location.origin,
          })}
        >
          Sign in
        </PageAction>
      </EmptyContent>
    </Empty>
  )
}

function Directory({ search, onSearchChange }: DirectoryProps) {
  const { q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key, which restarts the list.
  // The server leaves out every Page the viewer may not read.
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
    queryKey: qk.pages.list(filters),
    fetchPage: (page) => fetchBrowsablePages(filters, page),
  })

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search pages"
        />
      </div>

      <InfiniteList
        items={list.items}
        getKey={(page) => page.id}
        renderItem={(page) => <PageCard page={page} />}
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
            title="No pages"
            description={
              q
                ? "Nothing matches this search."
                : "Nobody has created a page yet."
            }
          />
        }
      >
        {(rendered) => <CardGrid columns={3}>{rendered}</CardGrid>}
      </InfiniteList>
    </>
  )
}
