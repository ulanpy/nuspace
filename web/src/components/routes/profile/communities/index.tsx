import { Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { keepPreviousData } from "@tanstack/react-query"
import { UsersIcon } from "lucide-react"

import { qk } from "@/api/query-keys"
import { fetchCommunitiesPage } from "@/lib/communities"
import { selectMedia } from "@/lib/media"
import { SettingsSection } from "@/components/shared/settings/settings-section"
import { TablePagination } from "@/components/shared/table/pagination"
import { pageRangeSummary } from "@/components/shared/table/page-range"
import { EmptyState, QueryBoundary } from "@/components/shared/query/boundary"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { MyCommunitiesSearch } from "@/routes/_app/profile/communities"

const PAGE_SIZE = 10

/**
 * The communities this user heads.
 *
 * No new endpoint: `GET /communities?owner_sub=me` already answers it and
 * already paginates. Unlike the admin-controls tab there is nothing to manage
 * here — the owner cannot add or remove themselves — so a row is a link and
 * nothing else. A share link would be the obvious thing to add, and it is
 * deliberately absent: it belongs to the community's own settings, not to a
 * list of the ones you happen to own.
 */
export function Page({
  search,
  onPageChange,
}: {
  search: MyCommunitiesSearch
  onPageChange: (page: number) => void
}) {
  const query = useQuery({
    queryKey: qk.communities.list({ owner_sub: "me", page: search.page }),
    queryFn: () =>
      fetchCommunitiesPage(
        { owner_sub: "me" },
        { page: search.page, size: PAGE_SIZE }
      ),
    placeholderData: keepPreviousData,
  })

  return (
    <SettingsSection
      title="My communities"
      description="Communities you head across Nuspace."
    >
      <QueryBoundary
        query={query}
        pending={<Skeleton className="h-12 w-full" />}
        isEmpty={(data) => (data.items ?? []).length === 0}
        empty={
          <EmptyState
            title="You don't own any community"
            description="Communities you own show up here."
            action={
              <Button
                nativeButton={false}
                variant="outline"
                className="w-full"
                render={<Link to="/communities">Create a community</Link>}
              />
            }
          />
        }
      >
        {(data) => (
          <ul className="space-y-1">
            {(data.items ?? []).map((community) => (
              <li key={community.id}>
                <Link
                  to="/communities/$slug"
                  params={{ slug: community.slug }}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <ResilientImage
                    src={selectMedia(community.media, "profile")?.url}
                    alt=""
                    aria-hidden
                    containerClassName="size-8 shrink-0 rounded-full"
                    fallback={
                      <span
                        aria-hidden
                        className="grid size-full place-items-center bg-muted"
                      >
                        <UsersIcon className="size-4 text-muted-foreground" />
                      </span>
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {community.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground capitalize">
                      {community.category} · {community.type}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <TablePagination
        page={search.page}
        totalPages={query.data?.total_pages ?? 1}
        hasNext={query.data?.has_next ?? false}
        summary={pageRangeSummary(query.data)}
        isFetching={query.isFetching && !query.isPlaceholderData}
        disabled={query.isPlaceholderData}
        onPageChange={onPageChange}
      />
    </SettingsSection>
  )
}
