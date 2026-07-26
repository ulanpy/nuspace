import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  CalendarClockIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WalletIcon,
} from "lucide-react"
import { z } from "zod"

import { apiErrorMessage } from "@/api/errors"
import { qk } from "@/api/query-keys"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { usePermissions } from "@/features/auth/use-session"
import {
  fetchOpportunitiesPage,
  useCreateOpportunity,
  useDeleteOpportunity,
  useUpdateOpportunity,
} from "@/features/opportunities/api"
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form"
import {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  type Opportunity,
} from "@/features/opportunities/types"
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
  type: z.enum(OPPORTUNITY_TYPES).optional(),
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
    </Card>
  )
}

function Opportunities() {
  const { type, q } = Route.useSearch()
  const filters = { type: type ? [type] : undefined, q, hide_expired: true }

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
