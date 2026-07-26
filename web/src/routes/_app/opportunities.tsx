import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"
import { z } from "zod"

import { apiErrorMessage } from "@/api/errors"
import { ApiError } from "@/api/client"
import { qk } from "@/api/query-keys"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { usePermissions } from "@/features/auth/use-session"
import { beginLogin } from "@/features/auth/api"
import {
  fetchOpportunitiesPage,
  useCreateOpportunity,
  useDeleteOpportunity,
  useAddOpportunityToCalendar,
  useUpdateOpportunity,
} from "@/features/opportunities/api"
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form"
import {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  OPPORTUNITY_MAJORS,
  formatEligibilities,
  normalizeMajors,
  type EducationLevel,
  type OpportunityMajor,
  type Opportunity,
} from "@/features/opportunities/types"
import { useDebounced } from "@/hooks/use-debounced"
import {
  MultiFilter,
  SearchFilter,
  type FilterOption,
} from "@/components/list-filters"
import { formatCampusDate, formatRelative, isPast } from "@/lib/datetime"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toPlainText } from "@/components/markdown"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const opportunitiesSearchSchema = z.object({
  type: z.array(z.enum(OPPORTUNITY_TYPES)).optional(),
  majors: z.array(z.enum(OPPORTUNITY_MAJORS)).optional(),
  education: z.array(z.enum(EDUCATION_LEVELS)).optional(),
  years: z.array(z.coerce.number()).optional(),
  hideExpired: z.boolean().default(true),
  q: z.string().optional(),
})

export const Route = createFileRoute("/_app/opportunities")({
  validateSearch: opportunitiesSearchSchema,
  component: Opportunities,
})

function OpportunityCard({
  opportunity,
  onEdit,
  onDelete,
}: {
  opportunity: Opportunity
  /** Both omitted for readers, which is everyone but the digest's authors. */
  onEdit?: () => void
  onDelete?: () => void
}) {
  const expired = opportunity.deadline ? isPast(opportunity.deadline) : false
  const calendar = useAddOpportunityToCalendar()
  const majors = normalizeMajors(opportunity.majors)
  const eligibilities = formatEligibilities(opportunity.eligibilities)

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
        </Badge>
        {expired && <Badge variant="outline">Closed</Badge>}
      </div>

      <h3 className="leading-snug font-semibold text-balance">
        {opportunity.name}
      </h3>

      {opportunity.host && (
        <p className="text-sm text-muted-foreground">{opportunity.host}</p>
      )}

      {opportunity.description && (
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {toPlainText(opportunity.description)}
        </p>
      )}

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {opportunity.deadline && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Deadline</dt>
            <CalendarClockIcon className="size-4 shrink-0" aria-hidden />
            <dd>
              {formatCampusDate(opportunity.deadline)}
              {!expired && ` (${formatRelative(opportunity.deadline)})`}
            </dd>
          </div>
        )}
        {opportunity.location && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Location</dt>
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            <dd>{opportunity.location}</dd>
          </div>
        )}
        {opportunity.funding && (
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">Funding</dt>
            <WalletIcon className="size-4 shrink-0" aria-hidden />
            <dd>{opportunity.funding}</dd>
          </div>
        )}
      </dl>

      {(majors.length > 0 || eligibilities.length > 0) && (
        <div className="flex flex-wrap gap-1">
          {eligibilities.map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
          {majors.slice(0, 5).map((major) => (
            <Badge key={major} variant="secondary">
              {major}
            </Badge>
          ))}
          {majors.length > 5 && (
            <Badge variant="secondary">+{majors.length - 5} majors</Badge>
          )}
        </div>
      )}
    </>
  )

  return (
    <Card className="p-4">
      {opportunity.link ? (
        <a
          href={opportunity.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block space-y-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {body}
        </a>
      ) : (
        <div className="space-y-2">{body}</div>
      )}

      {(onEdit ?? onDelete) && (
        <div className="mt-3 flex gap-1 border-t border-border pt-3">
          {onEdit && (
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              <PencilIcon aria-hidden />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon aria-hidden />
              Delete
            </Button>
          )}
        </div>
      )}

      {opportunity.deadline && !expired && (
        <div className="mt-3 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={calendar.isPending}
            onClick={() => {
              calendar.mutate(opportunity.id)
            }}
          >
            <CalendarPlusIcon aria-hidden />
            {calendar.isPending ? "Adding…" : "Add deadline to calendar"}
          </Button>
          {calendar.isSuccess && (
            <p className="mt-1 text-xs text-success">
              {calendar.data.google_errors.length > 0
                ? "Calendar added with warnings from Google."
                : "Added to Google Calendar."}
            </p>
          )}
          {calendar.isError && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-destructive">
              <span>
                {calendar.error instanceof ApiError &&
                (calendar.error.status === 401 || calendar.error.status === 403)
                  ? "Google permission needs to be renewed."
                  : apiErrorMessage(
                      calendar.error,
                      "Could not add this deadline."
                    )}
              </span>
              {calendar.error instanceof ApiError &&
                (calendar.error.status === 401 ||
                  calendar.error.status === 403) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      beginLogin()
                    }}
                  >
                    Sign in again
                  </Button>
                )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function Opportunities() {
  const {
    type = [],
    majors = [],
    education = [],
    years = [],
    hideExpired,
    q,
  } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [search, setSearch] = useState(q ?? "")
  const debouncedSearch = useDebounced(search)
  const filters = {
    type: type.length > 0 ? type : undefined,
    majors: majors.length > 0 ? majors : undefined,
    education_level: education.length > 0 ? education : undefined,
    years: years.length > 0 ? years : undefined,
    q,
    hide_expired: hideExpired,
  }

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

  useEffect(() => {
    setSearch(q ?? "")
  }, [q])

  useEffect(() => {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: debouncedSearch || undefined,
      }),
      replace: true,
    })
  }, [debouncedSearch, navigate])

  const saving = createOpportunity.isPending || updateOpportunity.isPending
  const saveError = createOpportunity.error ?? updateOpportunity.error

  const closeForm = () => {
    setEditing(null)
    createOpportunity.reset()
    updateOpportunity.reset()
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Opportunities Digest
          </h1>
          <p className="text-muted-foreground">
            Research, internships, grants and scholarships for NU students.
          </p>
        </div>

        {/*
          Only for people the backend will actually let through. The old page
          rendered this for signed-out visitors as well, who were then sent to
          sign in and came back to a button that still refused to open.
        */}
        {canManageOpportunities && (
          <Button
            onClick={() => {
              setEditing({})
            }}
          >
            <PlusIcon aria-hidden />
            Add opportunity
          </Button>
        )}
      </header>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search opportunities"
        />
        <div className="flex flex-wrap gap-2">
          <MultiFilter
            label="Types"
            selected={type}
            options={TYPE_OPTIONS}
            onChange={(next) => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  type: next.length > 0 ? next : undefined,
                }),
              })
            }}
          />
          <MultiFilter
            label="Education"
            selected={education}
            options={EDUCATION_OPTIONS}
            onChange={(next) => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  education: next.length > 0 ? next : undefined,
                }),
              })
            }}
          />
          <MultiFilter
            label="Years"
            selected={years.map(String)}
            options={YEAR_OPTIONS}
            onChange={(next) => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  years:
                    next.length > 0
                      ? next.map((value) => Number(value))
                      : undefined,
                }),
              })
            }}
          />
          <MultiFilter
            label="Majors"
            selected={majors}
            options={MAJOR_OPTIONS}
            onChange={(next) => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  majors: next.length > 0 ? next : undefined,
                }),
              })
            }}
          />
          <Button
            variant={hideExpired ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              void navigate({
                search: (previous) => ({
                  ...previous,
                  hideExpired: !hideExpired,
                }),
              })
            }}
          >
            {hideExpired ? "Show expired" : "Hide expired"}
          </Button>
        </div>
      </div>

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
            description="Nothing open right now. Check back soon."
          />
        }
      >
        {(rendered) => (
          <div className="grid gap-4 lg:grid-cols-2">{rendered}</div>
        )}
      </InfiniteList>

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
            form rather than leaving the previous values in place — react-hook-form
            reads defaultValues once.
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
                  createOpportunity.mutate(payload, { onSuccess: closeForm })
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
    </div>
  )
}

const TYPE_OPTIONS = OPPORTUNITY_TYPES.map((value) => ({
  value,
  label: OPPORTUNITY_TYPE_LABELS[value],
}))

const EDUCATION_OPTIONS = EDUCATION_LEVELS.map((value) => ({
  value,
  label: EDUCATION_LEVEL_LABELS[value],
})) satisfies FilterOption<EducationLevel>[]

const YEAR_OPTIONS = [1, 2, 3, 4].map((value) => ({
  value: String(value),
  label: `Year ${String(value)}`,
}))

const MAJOR_OPTIONS = OPPORTUNITY_MAJORS.map((value) => ({
  value,
  label: value,
})) satisfies FilterOption<OpportunityMajor>[]
