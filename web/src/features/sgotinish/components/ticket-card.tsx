import { Link } from "@tanstack/react-router"
import { EyeOff, MessageSquare } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatRelative } from "@/lib/datetime"
import { cn } from "@/lib/utils"

import { STATUS_LABEL, type Ticket, type TicketStatus } from "../types"

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "border-primary/50 text-primary",
  in_progress: "border-warning/60 text-foreground",
  resolved: "border-border text-muted-foreground",
  closed: "border-border text-muted-foreground",
}

interface TicketCardProps {
  ticket: Ticket
  /** Where the title links to — the SG and student views differ. */
  to: "/sgotinish/sg/$ticketId" | "/sgotinish/student/$ticketId"
}

export function TicketCard({ ticket, to }: TicketCardProps) {
  return (
    <Card className="overflow-hidden p-0 transition-colors hover:border-primary/40 hover:bg-muted/20">
      <Link
        to={to}
        params={{ ticketId: String(ticket.id) }}
        className="block rounded-xl p-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{ticket.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
              {ticket.body}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {ticket.unread_count > 0 && (
              <Badge className="tabular-nums">{ticket.unread_count} new</Badge>
            )}
            <Badge variant="outline" className={STATUS_STYLES[ticket.status]}>
              {STATUS_LABEL[ticket.status]}
            </Badge>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="capitalize">{ticket.category}</span>
          <span>{formatRelative(ticket.created_at)}</span>

          {ticket.conversations.length > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="size-3" aria-hidden />
              {ticket.conversations.reduce(
                (total, conversation) => total + conversation.messages_count,
                0
              )}
            </span>
          )}

          {ticket.is_anonymous && (
            <span
              className={cn("flex items-center gap-1")}
              title="The author is not identified to anyone, including SG"
            >
              <EyeOff className="size-3" aria-hidden />
              Anonymous
            </span>
          )}
        </div>
      </Link>
    </Card>
  )
}
