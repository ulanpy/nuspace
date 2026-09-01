import { EyeOff } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { formatRelative } from "@/lib/datetime"

import { STATUS_LABEL, type Ticket } from "../types"

export function TicketHeader({ ticket }: { ticket: Ticket }) {
  const author = ticket.author
    ? `${ticket.author.name} ${ticket.author.surname}`
    : null

  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-xl font-semibold">{ticket.title}</h2>
        <Badge variant="outline">{STATUS_LABEL[ticket.status]}</Badge>
      </div>

      <p className="text-sm whitespace-pre-wrap">{ticket.body}</p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="capitalize">{ticket.category}</span>
        <span>{formatRelative(ticket.created_at)}</span>
        {ticket.is_anonymous ? (
          <span className="flex items-center gap-1">
            <EyeOff className="size-3" aria-hidden />
            {/* Not "author hidden": there is no author recorded to hide. */}
            Sent anonymously — no author is recorded
          </span>
        ) : (
          author && <span>{author}</span>
        )}
      </div>
    </Card>
  )
}
