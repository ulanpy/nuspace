import { useEffect, useMemo, useState } from "react"
import { PlusIcon, SlidersHorizontalIcon } from "lucide-react"

import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import type { OpportunitiesSearch } from "@/routes/_app/opportunities"
import { useDebounced } from "@/hooks/use-debounced"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { useIsWide } from "@/hooks/use-is-wide"
import { usePermissions } from "@/hooks/use-session"
import {
  activeFilterCount,
  fetchOpportunitiesPage,
  toApiFilters,
  useCreateOpportunity,
  useDeleteOpportunity,
  useUpdateOpportunity,
} from "@/lib/opportunities"
import type { Opportunity, OpportunitiesSearchState } from "@/lib/opportunities"
import { FilterRail } from "@/components/routes/opportunities/components/filter-rail"
import { OpportunityCard } from "@/components/routes/opportunities/components/opportunity-card"
import { OpportunityForm } from "@/components/routes/opportunities/components/opportunity-form"
import { SearchFilter } from "@/components/shared/list-filters"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { CardGrid } from "@/components/shared/page/card-grid"
import { Page as PageLayout } from "@/components/shared/page"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function OpportunitiesScreen({
  search,
  onSearchChange,
}: {
  search: OpportunitiesSearch
  onSearchChange: (
    updater: (previous: OpportunitiesSearch) => OpportunitiesSearch,
    replace?: boolean
  ) => void
}) {
  const { q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  // Memoised: a fresh object is a new query key and restarts the infinite
  // list. The router shares structure, so `search` only changes identity when
  // a filter does.
  const filters = useMemo(() => toApiFilters(search), [search])

  const { canManageOpportunities } = usePermissions()

  const list = useInfiniteList({
    queryKey: qk.opportunities.list(filters),
    fetchPage: (page) => fetchOpportunitiesPage(filters, page),
  })

  /** `null` means the form is closed; `undefined` inside it means "creating". */
  const [editing, setEditing] = useState<{ opportunity?: Opportunity } | null>(
    null
  )
  const [deleting, setDeleting] = useState<Opportunity | null>(null)

  const createOpportunity = useCreateOpportunity()
  const updateOpportunity = useUpdateOpportunity()
  const deleteOpportunity = useDeleteOpportunity()

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

  const isWide = useIsWide()
  const [isRailOpen, setIsRailOpen] = useState(false)
  // The sheet and the sticky column are the same rail; only one is mounted.
  // Growing past `xl` with the sheet open retires it for good, so narrowing
  // again does not bring a stale sheet back.
  if (isWide && isRailOpen) setIsRailOpen(false)
  const sheetOpen = isRailOpen
  const activeCount = activeFilterCount(search)

  /** The rail edits filters only; the search box has its own debounced path. */
  const applyFilters = (next: OpportunitiesSearchState) => {
    onSearchChange((previous) => ({
      ...previous,
      type: next.type,
      education: next.education,
      years: next.years,
      majors: next.majors,
      hideExpired: next.hideExpired,
    }))
  }
  const rail = <FilterRail search={search} onSearchChange={applyFilters} />

  const saving = createOpportunity.isPending || updateOpportunity.isPending
  const saveError = createOpportunity.error ?? updateOpportunity.error

  const closeForm = () => {
    setEditing(null)
    createOpportunity.reset()
    updateOpportunity.reset()
  }

  return (
    <PageLayout
      title="Opportunities Digest"
      description="Research, internships, grants and scholarships for NU students."
      actions={
        // Only people the backend will actually let through see this action.
        canManageOpportunities ? (
          <Button
            onClick={() => {
              setEditing({})
            }}
          >
            <PlusIcon aria-hidden />
            Add opportunity
          </Button>
        ) : undefined
      }
    >
      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        {isWide && (
          // Below the 3.5rem header, with a little air.
          <aside aria-label="Filters" className="sticky top-18">
            {rail}
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          <Card className="flex-row flex-wrap items-center gap-3 p-3">
            <SearchFilter
              className="w-64 min-w-0 flex-none max-sm:w-full max-sm:flex-1"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search opportunities"
            />
            {!isWide && (
              <Button
                variant="outline"
                onClick={() => {
                  setIsRailOpen(true)
                }}
              >
                <SlidersHorizontalIcon aria-hidden />
                Filters
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">
                    {activeCount}
                  </span>
                )}
              </Button>
            )}
            {list.total > 0 && (
              <span className="ml-auto hidden shrink-0 text-sm text-muted-foreground sm:block">
                {list.total}{" "}
                {list.total === 1 ? "opportunity" : "opportunities"}
              </span>
            )}
          </Card>

          <InfiniteList
            items={list.items}
            getKey={(opportunity) => opportunity.id}
            renderItem={(opportunity) => (
              <OpportunityCard
                opportunity={opportunity}
                onEdit={
                  canManageOpportunities
                    ? () => {
                        setEditing({ opportunity })
                      }
                    : undefined
                }
                onDelete={
                  canManageOpportunities
                    ? () => {
                        setDeleting(opportunity)
                      }
                    : undefined
                }
              />
            )}
            isPending={list.isPending}
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
                title="No opportunities"
                description={
                  activeCount > 0 || q
                    ? "Nothing matches these filters. Try clearing some."
                    : "Nothing open right now. Check back soon."
                }
              />
            }
          >
            {(rendered) => <CardGrid columns={1}>{rendered}</CardGrid>}
          </InfiniteList>
        </div>
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setIsRailOpen(open)
        }}
      >
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle className="sr-only">Filters</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-4 pb-4">{rail}</div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !saving) closeForm()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing?.opportunity ? "Edit opportunity" : "Add opportunity"}
            </DialogTitle>
          </DialogHeader>

          {/*
						Keyed so switching straight from one record to another rebuilds the
						form rather than leaving the previous values in place —
						react-hook-form reads defaultValues once.
					*/}
          {editing && (
            <OpportunityForm
              key={editing.opportunity?.id ?? "new"}
              opportunity={editing.opportunity}
              isPending={saving}
              submitError={
                saveError
                  ? apiErrorMessage(
                      saveError,
                      "Could not save the opportunity. Try again."
                    )
                  : null
              }
              onCancel={closeForm}
              onSubmit={(payload) => {
                const target = editing.opportunity
                if (target) {
                  updateOpportunity.mutate(
                    { id: target.id, body: payload },
                    { onSuccess: closeForm }
                  )
                } else {
                  createOpportunity.mutate(payload, {
                    onSuccess: closeForm,
                  })
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null)
            deleteOpportunity.reset()
          }
        }}
        title="Delete this opportunity?"
        description={
          deleting
            ? `“${deleting.name}” will be removed from the digest for everyone. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        isPending={deleteOpportunity.isPending}
        onConfirm={() => {
          if (!deleting) return
          deleteOpportunity.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
            },
          })
        }}
      />

      {deleteOpportunity.isError && (
        <p className="text-sm text-destructive" role="alert">
          {apiErrorMessage(
            deleteOpportunity.error,
            "Could not delete the opportunity. Try again."
          )}
        </p>
      )}
    </PageLayout>
  )
}
