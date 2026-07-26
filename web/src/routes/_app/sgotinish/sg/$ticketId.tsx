import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { Loader2, MessageSquarePlus, UserPlus } from "lucide-react"

import {
  ticketQueryOptions,
  useStartConversation,
  useUpdateTicketStatus,
} from "@/features/sgotinish/api"
import { useCurrentUser, usePermissions } from "@/features/auth/use-session"
import { ConversationView } from "@/features/sgotinish/components/conversation"
import { DelegateDialog } from "@/features/sgotinish/components/delegate-dialog"
import { TicketHeader } from "@/features/sgotinish/components/ticket-header"
import type { Actor } from "@/features/sgotinish/permissions"
import {
  PERMISSION_LABEL,
  STATUS_LABEL,
  TICKET_STATUSES,
  canReplyWithAccess,
  type Ticket,
} from "@/features/sgotinish/types"
import { formatCampusDate } from "@/lib/datetime"
import { QueryBoundary } from "@/components/query-boundary"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

  const user = useCurrentUser()
  const { role, isAdmin } = usePermissions()

  const startConversation = useStartConversation()
  const updateStatus = useUpdateTicketStatus()
  const [isDelegating, setIsDelegating] = useState(false)

  const actor: Actor = {
    role:
      role === "admin" ||
      role === "boss" ||
      role === "capo" ||
      role === "soldier"
        ? role
        : "default",
    sub: user.sub,
    departmentId: user.department_id,
  }

  return (
    <QueryBoundary query={query}>
      {(ticket) => {
        const access = ticket.ticket_access ?? null

        /**
         * Delegating requires the `delegate` permission on this specific
         * ticket — being a boss elsewhere is not enough. Admins bypass it, as
         * they do server-side.
         */
        const canDelegate = isAdmin || access === "delegate"

        // Replying is `assign` or `delegate`; `view` is read-only. An admin can
        // always reply.
        const canReply =
          ticket.status !== "closed" && (isAdmin || canReplyWithAccess(access))

        return (
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

              {canDelegate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsDelegating(true)
                  }}
                >
                  <UserPlus aria-hidden />
                  Grant access
                </Button>
              )}
            </div>

            {!canReply && ticket.status !== "closed" && (
              <p className="text-sm text-muted-foreground">
                You can read this ticket but not reply to it. Ask whoever gave
                you access for the “{PERMISSION_LABEL.assign}” permission.
              </p>
            )}

            <AccessList ticket={ticket} />

            {ticket.conversations.map((conversation) => (
              <ConversationView
                key={conversation.id}
                conversation={conversation}
                canReply={canReply}
              />
            ))}

            <DelegateDialog
              ticketId={ticket.id}
              actor={actor}
              open={isDelegating}
              onOpenChange={setIsDelegating}
            />
          </div>
        )
      }}
    </QueryBoundary>
  )
}

/**
 * Who else can see this ticket.
 *
 * Worth showing plainly: an anonymous student's complaint being visible to six
 * people is a fact the SG members handling it should be able to check, and
 * before this the only way to know was to try delegating and see who was
 * already listed.
 */
function AccessList({ ticket }: { ticket: Ticket }) {
  const entries = ticket.access_list ?? []
  if (entries.length === 0) return null

  return (
    <Card className="space-y-2 p-4">
      <h2 className="text-sm font-semibold">
        Who has access ({String(entries.length)})
      </h2>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li
            key={entry.user.sub}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span>
              {entry.user.name} {entry.user.surname}
              {entry.granted_by && (
                <span className="text-muted-foreground">
                  {" "}
                  · granted by {entry.granted_by.name}{" "}
                  {entry.granted_by.surname} on{" "}
                  {formatCampusDate(entry.granted_at)}
                </span>
              )}
            </span>
            <Badge variant="outline">
              {PERMISSION_LABEL[entry.permission]}
            </Badge>
          </li>
        ))}
      </ul>
    </Card>
  )
}
