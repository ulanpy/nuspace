import { createFileRoute } from "@tanstack/react-router"
import { CalendarClockIcon, MapPinIcon, WalletIcon } from "lucide-react"
import { z } from "zod"

import { qk } from "@/api/query-keys"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { fetchOpportunitiesPage } from "@/features/opportunities/api"
import {
  OPPORTUNITY_TYPES,
  OPPORTUNITY_TYPE_LABELS,
  type Opportunity,
} from "@/features/opportunities/types"
import { formatCampusDate, formatRelative, isPast } from "@/lib/datetime"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

const opportunitiesSearchSchema = z.object({
  type: z.enum(OPPORTUNITY_TYPES).optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute("/_app/opportunities")({
  validateSearch: opportunitiesSearchSchema,
  component: Opportunities,
})

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
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
          {opportunity.description}
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
    </Card>
  )
}

function Opportunities() {
  const { type, q } = Route.useSearch()
  const filters = { type: type ? [type] : undefined, q, hide_expired: true }

  const list = useInfiniteList({
    queryKey: qk.opportunities.list(filters),
    fetchPage: (page) => fetchOpportunitiesPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          Opportunities Digest
        </h1>
        <p className="text-muted-foreground">
          Research, internships, grants and scholarships for NU students.
        </p>
      </header>

      <InfiniteList
        items={list.items}
        getKey={(opportunity) => opportunity.id}
        renderItem={(opportunity) => (
          <OpportunityCard opportunity={opportunity} />
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
    </div>
  )
}
