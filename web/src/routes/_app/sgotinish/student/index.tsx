import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { qk } from "@/api/query-keys"
import { fetchTicketsPage } from "@/features/sgotinish/api"
import { TicketCard } from "@/features/sgotinish/components/ticket-card"
import { NewTicketForm } from "@/features/sgotinish/components/new-ticket-form"
import { TICKET_STATUSES, type Ticket } from "@/features/sgotinish/types"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"

const studentSearchSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
})

export const Route = createFileRoute("/_app/sgotinish/student/")({
  validateSearch: studentSearchSchema,
  component: MyTickets,
})

function MyTickets() {
  const { status } = Route.useSearch()

  const list = useInfiniteList<Ticket>({
    queryKey: qk.sgotinish.list({ mine: true, status }),
    fetchPage: ({ page, size }) =>
      fetchTicketsPage({ page, size, status, author_sub: "me" }),
  })

  return (
    <div className="space-y-4">
      <NewTicketForm />

      <InfiniteList
        items={list.items}
        getKey={(ticket) => ticket.id}
        renderItem={(ticket) => (
          <TicketCard ticket={ticket} to="/sgotinish/student/$ticketId" />
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
            title="You have not raised anything yet"
            description="Tickets you send to Student Government appear here."
          />
        }
      />
    </div>
  )
}
