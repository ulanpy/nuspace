import { useState } from "react"
import { PlusIcon, SettingsIcon, TrashIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import type { AccountSearch } from "@/routes/_app/account"
import { useDataTable } from "@/hooks/use-data-table"
import {
  canEditField,
  myPagesQueryOptions,
  ownershipLabel,
  pageOwnership,
  sortingToSearch,
  useDeletePage,
} from "@/lib/pages"
import {
  isPageSort,
  PAGE_OWNERSHIP_FILTERS,
  PAGE_SIZES,
  PAGE_VISIBILITY_FILTERS,
} from "@/lib/pages/constants"
import type { Page } from "@/lib/pages"
import { selectMedia } from "@/lib/media"
import { useCurrentUser } from "@/hooks/use-session"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TablePagination } from "@/components/shared/table/pagination"
import { pageRangeSummary } from "@/components/shared/table/page-range"
import { DataTable } from "@/components/shared/data-table/data-table"
import { DataTableColumnHeader } from "@/components/shared/data-table/data-table-column-header"
import { DataTableToolbar } from "@/components/shared/data-table/data-table-toolbar"
import { FilterTabs, MultiFilter } from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { PageFormDialog } from "@/components/shared/pages/page-form-dialog"
import { visibilityLabel } from "@/components/shared/pages/visibilities"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

/**
 * The pages the signed-in user owns or administers.
 *
 * A table and not the bordered `<ul>` this replaced. The list was a row per
 * page with a trailing badge, and the same data in six columns — role,
 * visibility and the settings link were all missing — does not fit a list whose
 * only varying part is a name. Sorting and filtering are the reason to reach for
 * a table at all: with forty pages the owner is looking for is on page three.
 *
 * Paging, sorting and filtering all happen on the server. `useDataTable` is
 * passed one page of rows and told not to sort or page them, so nothing here
 * reorders or re-filters what the API just decided.
 */
export function MyPages({
  search,
  onSearchChange,
  onPageCreated,
}: {
  search: AccountSearch
  onSearchChange: (updater: (previous: AccountSearch) => AccountSearch) => void
  onPageCreated: (slug: string) => void
}) {
  const me = useCurrentUser()
  const [isCreating, setIsCreating] = useState(false)
  const [deleting, setDeleting] = useState<Page | null>(null)
  const deletePage = useDeletePage()

  const { page, size, role, visibility, sort, order } = search

  const query = useQuery({
    ...myPagesQueryOptions({ page, size, role, visibility, sort, order }),
    // The previous page stays on screen while the next one loads, so paging
    // does not flash an empty list between clicks.
    placeholderData: keepPreviousData,
  })

  const rows = query.data?.items ?? []
  const hasFilters = role !== undefined || (visibility?.length ?? 0) > 0

  /**
   * Every filter and sort change resets to page 1.
   *
   * Without this, narrowing a filter while sitting on page 4 of 9 asks the API
   * for page 4 of a 1-page result and lands on an empty table with a footer
   * claiming there are four pages. The backend does not clamp, and it should
   * not: this is a question about the URL, not about the data.
   */
  const changeSearch = (
    patch: Partial<AccountSearch>,
    { resetPage = true }: { resetPage?: boolean } = {}
  ) => {
    onSearchChange((previous) => ({
      ...previous,
      ...patch,
      page: resetPage ? 1 : (patch.page ?? previous.page),
    }))
  }

  const columns: ColumnDef<Page>[] = [
    {
      id: "logo",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <ResilientImage
          src={selectMedia(row.original.media, "profile")?.url}
          alt=""
          aria-hidden
          containerClassName="size-10 rounded-md"
          fallback={
            <span
              aria-hidden
              className="grid size-full place-items-center rounded-md bg-page/15 font-medium text-page"
            >
              {row.original.name.charAt(0).toUpperCase()}
            </span>
          }
        />
      ),
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link
          to="/p/$slug"
          params={{ slug: row.original.slug }}
          className="font-medium hover:underline"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      id: "slug",
      accessorKey: "slug",
      // Not sortable: the backend's whitelist is name / visibility / created_at.
      // A chevron on a column that cannot sort is a lie about the table.
      enableSorting: false,
      header: () => <span className="text-muted-foreground">Slug</span>,
      cell: ({ row }) => (
        <span
          className="block max-w-48 truncate font-mono text-sm text-muted-foreground"
          title={row.original.slug}
        >
          {row.original.slug}
        </span>
      ),
    },
    {
      id: "role",
      header: () => <span>Role</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {ownershipLabel(pageOwnership(row.original, me.sub))}
        </Badge>
      ),
    },
    {
      id: "visibility",
      accessorKey: "visibility",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Visibility" />
      ),
      cell: ({ row }) => (
        <Badge variant="outline">
          {visibilityLabel(row.original.visibility)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => null,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {canEditField(row.original, "name") ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Settings for ${row.original.name}`}
              nativeButton={false}
              render={
                <Link
                  to="/p/$slug/settings"
                  params={{ slug: row.original.slug }}
                />
              }
            >
              <SettingsIcon aria-hidden />
            </Button>
          ) : null}
          {row.original.permissions.can_delete ? (
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={`Delete ${row.original.name}`}
              onClick={() => setDeleting(row.original)}
            >
              <TrashIcon aria-hidden />
            </Button>
          ) : null}
        </div>
      ),
    },
  ]

  const table = useDataTable({
    data: rows,
    columns,
    getRowId: (row) => String(row.id),
    // The URL is the only home for the sort, so the header chevrons are told
    // which column is active rather than keeping a second copy of it here.
    sorting: sort ? [{ id: sort, desc: order !== "asc" }] : [],
    // `sorting` is controlled, so without this the chevrons do nothing at all.
    onSortingChange: (updater) => {
      const current = sort ? [{ id: sort, desc: order !== "asc" }] : []
      changeSearch(
        sortingToSearch(
          typeof updater === "function" ? updater(current) : updater,
          isPageSort
        )
      )
    },
  })

  return (
    <SettingsSection
      title="My Pages"
      description="Pages you own across Nuspace, and pages where you are an admin."
    >
      <DataTable
        table={table}
        isLoading={query.isPending}
        toolbar={() => (
          <DataTableToolbar>
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
            <Button className="ml-auto" onClick={() => setIsCreating(true)}>
              <PlusIcon aria-hidden />
              Create page
            </Button>
          </DataTableToolbar>
        )}
        emptyState={
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
              action={
                <Button onClick={() => setIsCreating(true)}>
                  <PlusIcon aria-hidden />
                  Create page
                </Button>
              }
            />
          )
        }
      />

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

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete this page?"
        description={
          <>
            <strong>{deleting?.name}</strong> will be deleted. Pages that link
            to it will keep the link, and will not render the page. This cannot
            be undone.
          </>
        }
        confirmLabel="Delete"
        isPending={deletePage.isPending}
        onConfirm={() => {
          if (deleting) {
            deletePage.mutate(deleting.slug, {
              onSuccess: () => {
                setDeleting(null)
              },
            })
          }
        }}
      />
    </SettingsSection>
  )
}
