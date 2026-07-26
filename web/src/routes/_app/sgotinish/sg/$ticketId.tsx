import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageSquarePlus } from "lucide-react"

import {
  ticketQueryOptions,
  useStartConversation,
  useUpdateTicketStatus,
} from "@/features/sgotinish/api"
import { ConversationView } from "@/features/sgotinish/components/conversation"
import { TicketHeader } from "@/features/sgotinish/components/ticket-header"
import { STATUS_LABEL, TICKET_STATUSES } from "@/features/sgotinish/types"
import { QueryBoundary } from "@/components/query-boundary"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Route = createFileRoute("/_app/sgotinish/sg/$ticketId")({
  component: SgTicket,
})

function SgTicket() {
  const { ticketId } = Route.useParams()
  const query = useQuery(ticketQueryOptions(Number(ticketId)))

  const startConversation = useStartConversation()
  const updateStatus = useUpdateTicketStatus()

  return (
    <QueryBoundary query={query}>
      {(ticket) => (
        <div className="space-y-4">
          <TicketHeader ticket={ticket} />

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(value) => {
                if (value) {
                  updateStatus.mutate({
                    ticketId: ticket.id,
                    status: value,
                  })
                }
              }}
            >
              <SelectTrigger className="w-44" aria-label="Ticket status">
                <SelectValue>{STATUS_LABEL[ticket.status]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TICKET_STATUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {STATUS_LABEL[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {ticket.conversations.length === 0 && (
              <Button
                size="sm"
                disabled={startConversation.isPending}
                onClick={() => {
                  startConversation.mutate(ticket.id)
                }}
              >
                {startConversation.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <MessageSquarePlus aria-hidden />
                )}
                Take this ticket
              </Button>
            )}
          </div>

          {ticket.conversations.map((conversation) => (
            <ConversationView
              key={conversation.id}
              conversation={conversation}
              canReply={ticket.status !== "closed"}
            />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
