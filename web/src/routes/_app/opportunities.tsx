import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Building2Icon,
  CalendarClockIcon,
  CalendarPlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
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
import { beginReauthentication } from "@/features/auth/api"
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
import { getDeadlinePresentation } from "@/features/opportunities/presentation"
import { useDebounced } from "@/hooks/use-debounced"
import {
  MultiFilter,
  SearchFilter,
  type FilterOption,
} from "@/components/list-filters"
import { formatCampusDate } from "@/lib/datetime"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Markdown, toPlainText } from "@/components/markdown"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { PageHeader } from "@/components/page-header"
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
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [areMajorsExpanded, setAreMajorsExpanded] = useState(false)
  const calendar = useAddOpportunityToCalendar()
  const majors = normalizeMajors(opportunity.majors)
  const eligibilities = formatEligibilities(opportunity.eligibilities)
  const deadline = getDeadlinePresentation(opportunity.deadline)
  const expired = deadline.kind === "closed"
  const description = opportunity.description
    ? toPlainText(opportunity.description)
    : ""
  const canExpandDescription = description.length > 280
  const visibleMajors = areMajorsExpanded ? majors : majors.slice(0, 5)

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">
          {OPPORTUNITY_TYPE_LABELS[opportunity.type]}
        </Badge>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={
              deadline.kind === "closing-soon"
                ? "default"
                : deadline.kind === "closed"
                  ? "outline"
                  : "secondary"
            }
          >
            {deadline.label}
          </Badge>
          {opportunity.deadline && (
            <span className="text-xs text-muted-foreground">
              {formatCampusDate(opportunity.deadline)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg leading-snug font-semibold text-balance">
          {opportunity.name}
        </h3>
        {opportunity.host && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2Icon className="size-4 shrink-0" aria-hidden />
            {opportunity.host}
          </p>
        )}
      </div>

      {opportunity.description && (
        <div className="space-y-2">
          {isDescriptionExpanded ? (
            <Markdown className="text-sm text-muted-foreground">
              {opportunity.description}
            </Markdown>
          ) : (
            <p
              className={
                canExpandDescription
                  ? "line-clamp-4 text-sm leading-relaxed text-muted-foreground"
                  : "text-sm leading-relaxed text-muted-foreground"
              }
            >
              {description}
            </p>
          )}
          {canExpandDescription && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-3"
              aria-expanded={isDescriptionExpanded}
              onClick={() => {
                setIsDescriptionExpanded((value) => !value)
              }}
            >
              {isDescriptionExpanded ? (
                <ChevronUpIcon aria-hidden />
              ) : (
                <ChevronDownIcon aria-hidden />
              )}
              {isDescriptionExpanded ? "Show less" : "Read full description"}
            </Button>
          )}
        </div>
      )}

      <dl className="flex flex-wrap gap-2 text-xs">
        {opportunity.deadline && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            <dt className="sr-only">Deadline</dt>
            <CalendarClockIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{deadline.relative}</dd>
          </div>
        )}
        {opportunity.location && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            <dt className="sr-only">Location</dt>
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{opportunity.location}</dd>
          </div>
        )}
        {opportunity.funding && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
            <dt className="sr-only">Funding</dt>
            <WalletIcon className="size-3.5 shrink-0" aria-hidden />
            <dd>{opportunity.funding}</dd>
          </div>
        )}
      </dl>

      {eligibilities.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Eligibility
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {eligibilities.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {majors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Eligible majors
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {visibleMajors.map((major) => (
              <Badge key={major} variant="secondary">
                <GraduationCapIcon aria-hidden />
                {major}
              </Badge>
            ))}
            {majors.length > 5 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                aria-expanded={areMajorsExpanded}
                onClick={() => {
                  setAreMajorsExpanded((value) => !value)
                }}
              >
                {areMajorsExpanded
                  ? "Show fewer"
                  : `Show ${String(majors.length - 5)} more`}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {opportunity.link ? (
          <Button
            size="sm"
            render={
              <a
                href={opportunity.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLinkIcon aria-hidden />
                Application link
              </a>
            }
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            No application link provided
          </span>
        )}

        {opportunity.deadline && !expired && (
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
        )}

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

      {opportunity.deadline && !expired && (
        <div>
          {calendar.isSuccess && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={
                  calendar.data.google_errors.length > 0
                    ? "text-warning"
                    : "text-success"
                }
              >
                {calendar.data.google_errors.includes(
                  "insufficient_google_scope"
                )
                  ? "Google Calendar permission needs to be renewed."
                  : calendar.data.google_errors.length > 0
                    ? "Calendar added with warnings from Google."
                    : "Added to Google Calendar."}
              </span>
              {calendar.data.google_errors.includes(
                "insufficient_google_scope"
              ) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={beginReauthentication}
                >
                  Sign in again
                </Button>
              )}
            </div>
          )}
          {calendar.isError && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
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
                    onClick={beginReauthentication}
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
      <PageHeader
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
      />

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
          <div className="mx-auto grid max-w-4xl gap-4">{rendered}</div>
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
