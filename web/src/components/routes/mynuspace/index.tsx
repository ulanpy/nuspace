import { useEffect, useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"

import type { MyNuspaceSearch } from "@/routes/_app/mynuspace"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchPagesPage } from "@/lib/pages"
import { PageCard } from "@/components/routes/pages/components/page-card"
import { PageFormDialog } from "@/components/shared/pages/page-form-dialog"
import { useDebounced } from "@/hooks/use-debounced"
import { SearchFilter } from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { Page as PageLayout } from "@/components/shared/page"
import { Button } from "@/components/ui/button"

/**
 * The public pages directory.
 *
 * A browse grid and not a table, so `useInfiniteList` + `CardGrid` stay: the
 * rows are images, and a page of images is a grid. The category and type
 * filters are gone with the columns they filtered.
 */
export function Page({
  search,
  onSearchChange,
  onPageCreated,
}: {
  search: MyNuspaceSearch
  onSearchChange: (
    updater: (previous: MyNuspaceSearch) => MyNuspaceSearch,
    replace?: boolean
  ) => void
  onPageCreated: (slug: string) => void
}) {
  const { q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key, which restarts the infinite
  // list on every render.
  const filters = useMemo(() => ({ keyword: q }), [q])

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
    queryKey: qk.pages.list(filters),
    fetchPage: (page) => fetchPagesPage(filters, page),
  })

  return (
    <PageLayout
      title="Pages"
      description="Discover clubs, organizations, and campus groups."
      actions={
        // Open to any signed-in user, as on the server: creating a page makes
        // you its owner, and admins can verify it afterwards.
        <Button onClick={() => setIsCreating(true)}>
          <PlusIcon aria-hidden />
          Create page
        </Button>
      }
    >
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
                ? "Nothing matches this search yet."
                : "Nobody has created a page yet."
            }
          />
        }
      >
        {(rendered) => <CardGrid columns={3}>{rendered}</CardGrid>}
      </InfiniteList>

      <PageFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSaved={(page) => {
          onPageCreated(page.slug)
        }}
      />
    </PageLayout>
  )
}
