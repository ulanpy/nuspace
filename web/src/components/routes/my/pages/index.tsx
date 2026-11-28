import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { PencilIcon, PlusIcon, SettingsIcon } from "lucide-react"

import type { MyPagesSearch } from "@/routes/_app/_account/my/pages"
import { useCurrentUser } from "@/hooks/use-session"
import { canEditField, myPagesQueryOptions, pageOwnership } from "@/lib/pages"
import {
  PAGE_OWNERSHIP,
  PAGE_OWNERSHIP_FILTERS,
  PAGE_SIZES,
  PAGE_VISIBILITY_FILTERS,
} from "@/lib/pages/constants"
import { selectMedia } from "@/lib/media"
import { Page } from "@/components/shared/page"
import { PageAction } from "@/components/shared/page/action"
import { PageCard } from "@/components/shared/page/card"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { FilterTabs, MultiFilter } from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { PageFormDialog } from "@/components/shared/pages/page-form-dialog"
import { visibilityLabel } from "@/components/shared/pages/visibilities"
import { pageRangeSummary } from "@/components/shared/table/page-range"
import { TablePagination } from "@/components/shared/table/pagination"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * The Pages the signed-in user owns or administers, as the same cards the
 * directory shows, with their role and visibility on them and a way into the
 * editor and the settings.
 *
 * Paging and both filters happen on the server, so the URL carries all of
 * them. There is no search box: `GET /pages/mine` ignores `visibility` when a
 * keyword is set (it answers from Meilisearch), so a search field would make
 * the filter beside it quietly stop working. Deleting a Page lives in its
 * settings.
 */
export function MyPagesScreen({
  search,
  onSearchChange,
  onPageCreated,
}: {
  search: MyPagesSearch
  onSearchChange: (updater: (previous: MyPagesSearch) => MyPagesSearch) => void
  onPageCreated: (slug: string) => void
}) {
  const me = useCurrentUser()
  const [isCreating, setIsCreating] = useState(false)

  const { page, size, role, visibility } = search

  const query = useQuery({
    ...myPagesQueryOptions({ page, size, role, visibility }),
    // The previous page stays on screen while the next one loads, so paging
    // does not flash an empty list between clicks.
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.items ?? []
  const hasFilters = role !== undefined || (visibility?.length ?? 0) > 0

  /**
   * Every filter change resets to page 1. Narrowing a filter while on page 4
   * of 9 would otherwise ask the API for page 4 of a one-page result and land
   * on an empty list under a footer that still counts four pages.
   */
  const changeSearch = (
    patch: Partial<MyPagesSearch>,
    { resetPage = true }: { resetPage?: boolean } = {}
  ) => {
    onSearchChange((previous) => ({
      ...previous,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? previous.page),
    }))
  }

  const create = (
    <PageAction
      icon={PlusIcon}
      onClick={() => {
        setIsCreating(true)
      }}
    >
      Create page
    </PageAction>
  )

  return (
    <Page title="My Pages" actions={create}>
      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          label="Role"
          value={role}
          options={PAGE_OWNERSHIP_FILTERS}
          onChange={(next) => {
            changeSearch({ role: next })
          }}
        />
        <MultiFilter
          label="Visibility"
          selected={visibility ?? []}
          options={PAGE_VISIBILITY_FILTERS}
          onChange={(next) => {
            changeSearch({ visibility: next.length > 0 ? next : undefined })
          }}
        />
      </div>

      {query.isPending ? (
        <CardGridSkeleton columns={3} />
      ) : rows.length === 0 ? (
        hasFilters ? (
          <EmptyState
            title="No pages match your filters"
            description="Try a different role or visibility."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  changeSearch({ role: undefined, visibility: undefined })
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No pages yet"
            description="You do not own or administer any page yet."
            action={create}
          />
        )
      ) : (
        <CardGrid columns={3}>
          {rows.map((row) => (
            <PageCard
              key={row.id}
              name={row.name}
              description={row.description}
              banner={selectMedia(row.media, "banner")?.url}
              avatar={selectMedia(row.media, "profile")?.url}
              link={{ to: "/pages/$slug", params: { slug: row.slug } }}
              actions={
                <>
                  <Badge variant="secondary">
                    {PAGE_OWNERSHIP[pageOwnership(row, me.sub)]}
                  </Badge>
                  <Badge variant="outline">
                    {visibilityLabel(row.visibility)}
                  </Badge>
                  <span className="ml-auto flex gap-2">
                    {row.permissions.can_edit ? (
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Edit ${row.name}`}
                        nativeButton={false}
                        render={
                          <Link
                            to="/pages/$slug/edit"
                            params={{ slug: row.slug }}
                          />
                        }
                      >
                        <PencilIcon aria-hidden />
                      </Button>
                    ) : null}
                    {canEditField(row, "name") ? (
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Settings for ${row.name}`}
                        nativeButton={false}
                        render={
                          <Link
                            to="/pages/$slug/settings"
                            params={{ slug: row.slug }}
                          />
                        }
                      >
                        <SettingsIcon aria-hidden />
                      </Button>
                    ) : null}
                  </span>
                </>
              }
            />
          ))}
        </CardGrid>
      )}

      <TablePagination
        page={page}
        totalPages={query.data?.total_pages ?? 1}
        hasNext={query.data?.has_next ?? false}
        summary={pageRangeSummary(query.data)}
        isFetching={query.isFetching && !query.isPlaceholderData}
        disabled={query.isPlaceholderData}
        onPageChange={(next) => {
          changeSearch({ page: next }, { resetPage: false })
        }}
        pageSize={size}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(next) => {
          changeSearch({ size: next })
        }}
      />

      <PageFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSaved={(item) => {
          onPageCreated(item.slug)
        }}
      />
    </Page>
  )
}
