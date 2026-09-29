import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"

import type { AccountSearch } from "@/routes/_app/account"
import { qk } from "@/api/query-keys"
import { fetchPagesPage } from "@/lib/pages"
import type { Page } from "@/lib/pages"
import { selectMedia } from "@/lib/media"
import { useCurrentUser } from "@/hooks/use-session"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TablePagination } from "@/components/shared/table/pagination"
import { pageRangeSummary } from "@/components/shared/table/page-range"
import { QueryBoundary, EmptyState } from "@/components/shared/query/boundary"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { FilterTabs, type FilterOption } from "@/components/shared/list-filters"
import { PageFormDialog } from "@/components/shared/pages/page-form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"

const PAGE_SIZE = 10

const ROLE_OPTIONS = [
  { value: "owned", label: "Owned" },
  { value: "admin", label: "Admin" },
] satisfies FilterOption<NonNullable<AccountSearch["role"]>>[]

/**
 * The pages the signed-in user owns or administers.
 *
 * The same row as the admins table on a page's own settings: logo, name, and
 * a trailing badge saying which of the two relationships it is. A bordered
 * `<ul>` and a `PageRow` of its own were tried here first and read as a
 * different kind of list from the one two screens away.
 *
 * A list and not a card grid, unlike `/mynuspace`: this is a management list
 * where the name and the relationship to you matter more than the banner, and
 * the row count is bounded by `PAGE_SIZE` rather than unbounded.
 */
export function MyPages({
  search,
  onSearchChange,
  onPageCreated,
}: {
  search: AccountSearch
  onSearchChange: (
    updater: (previous: AccountSearch) => AccountSearch,
    replace?: boolean
  ) => void
  onPageCreated: (slug: string) => void
}) {
  const { page, role } = search
  const me = useCurrentUser()
  const [isCreating, setIsCreating] = useState(false)

  const query = useQuery({
    // `role` and `page` are both in the key, so switching tabs does not serve
    // the previous tab's cached page and paging does not serve the old filter.
    queryKey: qk.pages.mine(role, page),
    queryFn: () =>
      fetchPagesPage(role ? { role } : {}, { page, size: PAGE_SIZE }),
    // The previous page stays on screen while the next one loads, so paging
    // does not flash an empty list between clicks.
    placeholderData: keepPreviousData,
  })

  return (
    <SettingsSection
      title="My Pages"
      description="Pages you own across Nuspace, and pages where you are an admin."
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterTabs
          label="Relationship"
          value={role}
          options={ROLE_OPTIONS}
          onChange={(next) => {
            // Back to page 1: keeping page 5 while switching from Owned to
            // Admin lands the reader on an empty page with no way back but the
            // arrows.
            onSearchChange((previous) => ({
              ...previous,
              role: next,
              page: 1,
            }))
          }}
        />

        <Button onClick={() => setIsCreating(true)}>
          <PlusIcon aria-hidden />
          Create page
        </Button>
      </div>

      <QueryBoundary
        query={query}
        pending={<Skeleton className="h-12 w-full" />}
        isEmpty={(data) => (data.items ?? []).length === 0}
        empty={
          <EmptyState
            title="No pages yet"
            description={
              role === "admin"
                ? "You are not an admin of any page yet."
                : role === "owned"
                  ? "You do not own any page yet."
                  : "You do not own or administer any page yet."
            }
            action={
              <Button
                nativeButton={false}
                variant="outline"
                className="w-full"
                render={<Link to="/mynuspace" />}
              >
                Browse pages
              </Button>
            }
          />
        }
      >
        {(data) => (
          <ItemGroup className="gap-2">
            {(data.items ?? []).map((item) => (
              <PageRow
                key={item.id}
                page={item}
                // `owner` is the owner's `sub`, so the row can say which of
                // the two relationships this is without the filter telling it
                // — All sends pages from both sides.
                isOwner={item.owner === me.sub}
              />
            ))}
          </ItemGroup>
        )}
      </QueryBoundary>

      <TablePagination
        page={page}
        totalPages={query.data?.total_pages ?? 1}
        hasNext={query.data?.has_next ?? false}
        summary={pageRangeSummary(query.data)}
        isFetching={query.isFetching && !query.isPlaceholderData}
        disabled={query.isPlaceholderData}
        onPageChange={(next) => {
          onSearchChange((previous) => ({ ...previous, page: next }))
        }}
      />

      <PageFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        onSaved={(item) => {
          onPageCreated(item.slug)
        }}
      />
    </SettingsSection>
  )
}

function PageRow({ page, isOwner }: { page: Page; isOwner: boolean }) {
  return (
    <Item
      variant="muted"
      size="sm"
      render={<Link to="/p/$slug" params={{ slug: page.slug }} />}
    >
      <ItemMedia variant="image" className="rounded-md">
        <ResilientImage
          src={selectMedia(page.media, "profile")?.url}
          alt=""
          aria-hidden
          containerClassName="size-10 rounded-md"
          fallback={
            <span
              aria-hidden
              className="grid size-full place-items-center bg-page/15 font-medium text-page"
            >
              {page.name.charAt(0).toUpperCase()}
            </span>
          }
        />
      </ItemMedia>

      <ItemContent>
        <ItemTitle className="w-auto min-w-0 flex-1">{page.name}</ItemTitle>
      </ItemContent>

      <ItemActions className="ml-auto">
        <Badge variant="secondary">{isOwner ? "Owner" : "Admin"}</Badge>
      </ItemActions>
    </Item>
  )
}
