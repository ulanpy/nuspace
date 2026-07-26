import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { anonymousTicketQueryOptions } from "@/features/sgotinish/api"
import { ConversationView } from "@/features/sgotinish/components/conversation"
import { TicketHeader } from "@/features/sgotinish/components/ticket-header"
import {
  deriveOwnerHash,
  readKeyFromFragment,
  rememberKey,
} from "@/features/sgotinish/warp-key"
import { Card } from "@/components/ui/card"
import { SkeletonLines } from "@/components/query-boundary"

/**
 * An anonymous ticket, opened with its WarpKey.
 *
 * Deliberately outside the `_app` layout: the whole point is that the reader
 * need not be signed in, and requiring a session would tie the ticket back to
 * a person.
 *
 * The key arrives in the URL fragment, which browsers never transmit — so it
 * reaches this component without ever appearing in a request, a server log or
 * a `Referer` header. It is read once here and exchanged for its hash.
 */
export const Route = createFileRoute("/t")({
  component: AnonymousTicket,
})

function AnonymousTicket() {
  const [ownerHash, setOwnerHash] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  useEffect(() => {
    const key = readKeyFromFragment(window.location.hash)
    setHasKey(Boolean(key))
    if (!key) return

    void deriveOwnerHash(key).then((hash) => {
      setOwnerHash(hash)
      // Keep it locally so a bookmark without the fragment still works later.
      rememberKey(hash, key)
    })
  }, [])

  const query = useQuery(anonymousTicketQueryOptions(ownerHash))

  if (hasKey === false) {
    return (
      <Card className="mx-auto mt-12 max-w-lg space-y-2 p-6">
        <h1 className="text-xl font-semibold">This link is incomplete</h1>
        <p className="text-sm text-muted-foreground">
          An anonymous ticket link ends with <code>#key=…</code>. Some apps
          shorten links and drop that part — try opening the original link, or
          copying it in full rather than clicking it.
        </p>
      </Card>
    )
  }

  if (query.isError) {
    return (
      <Card className="mx-auto mt-12 max-w-lg space-y-2 p-6">
        <h1 className="text-xl font-semibold">No ticket for this link</h1>
        <p className="text-sm text-muted-foreground">
          The key does not match any ticket. Anonymous tickets cannot be
          recovered from anything else, so if the link was mistyped there is no
          way to look it up.
        </p>
      </Card>
    )
  }

  if (query.isPending || !ownerHash) {
    return (
      <div className="mx-auto mt-12 max-w-2xl">
        <SkeletonLines count={4} />
      </div>
    )
  }

  const ticket = query.data

  return (
    <div className="mx-auto mt-8 max-w-2xl space-y-4 px-4 pb-12">
      <TicketHeader ticket={ticket} />

      {ticket.conversations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Student Government has not picked this up yet. Keep this link — it is
          how you check back.
        </p>
      ) : (
        ticket.conversations.map((conversation) => (
          <ConversationView
            key={conversation.id}
            conversation={conversation}
            ownerHash={ownerHash}
            canReply={ticket.status !== "closed"}
          />
        ))
      )}
    </div>
  )
}
