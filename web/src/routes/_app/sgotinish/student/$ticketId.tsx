import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { ticketQueryOptions } from "@/features/sgotinish/api"
import { ConversationView } from "@/features/sgotinish/components/conversation"
import { TicketHeader } from "@/features/sgotinish/components/ticket-header"
import { QueryBoundary } from "@/components/query-boundary"

export const Route = createFileRoute("/_app/sgotinish/student/$ticketId")({
  component: StudentTicket,
})

function StudentTicket() {
  const { ticketId } = Route.useParams()
  const query = useQuery(ticketQueryOptions(Number(ticketId)))

  return (
    <QueryBoundary query={query}>
      {(ticket) => (
        <div className="space-y-4">
          <TicketHeader ticket={ticket} />

          {ticket.conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Student Government has not picked this up yet. You will be
              notified on Telegram when they reply.
            </p>
          ) : (
            ticket.conversations.map((conversation) => (
              <ConversationView
                key={conversation.id}
                conversation={conversation}
                canReply={ticket.status !== "closed"}
              />
            ))
          )}
        </div>
      )}
    </QueryBoundary>
  )
}
