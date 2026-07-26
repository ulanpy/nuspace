import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { SkeletonLines } from "@/components/query-boundary"
import { formatRelative } from "@/lib/datetime"
import { cn } from "@/lib/utils"

import {
  messagesQueryOptions,
  useMarkMessageRead,
  useSendMessage,
} from "../api"
import type { Conversation, Message } from "../types"

function senderName(message: Message): string {
  const { sender } = message

  if (sender) {
    // Two shapes: a plain user for students, and an SG member that nests the
    // user alongside their department and role.
    const person = "user" in sender ? sender.user : sender
    return [person.name, person.surname].filter(Boolean).join(" ")
  }

  // No sender on an anonymous author's message — by design, not missing data.
  return message.is_from_sg_member ? "Student Government" : "Anonymous author"
}

/**
 * One message.
 *
 * Sided by who wrote it rather than by who is reading: SG messages sit left,
 * the author's right. That stays consistent whether the SG member, the student
 * or the anonymous owner is looking, so a screenshot means the same thing to
 * everyone.
 */
function MessageBubble({ message }: { message: Message }) {
  const fromSg = message.is_from_sg_member

  return (
    <li className={cn("flex", fromSg ? "justify-start" : "justify-end")}>
      <div className="max-w-[85%] space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
            fromSg ? "bg-muted" : "bg-primary text-primary-foreground"
          )}
        >
          {message.body}
        </div>
        <p
          className={cn(
            "text-xs text-muted-foreground",
            fromSg ? "text-left" : "text-right"
          )}
        >
          {senderName(message)} · {formatRelative(message.sent_at)}
        </p>
      </div>
    </li>
  )
}

/**
 * Reports messages as read once they are on screen.
 *
 * `unread_count` on the ticket list is driven by `POST /messages/{id}/read`,
 * which the ported conversation view never called — so a ticket read five
 * times still advertised unread replies, and SG members learned to ignore the
 * badge. Rendering the conversation is the read event: there is no separate
 * "open" step, and the whole thread is on screen at once.
 *
 * Each id is only ever sent once per mount. Without that, the 20-second
 * refetch would re-post a receipt for every message on every poll.
 */
function useReadReceipts(
  conversationId: number,
  messages: readonly Message[],
  ownerHash?: string
) {
  const markRead = useMarkMessageRead(conversationId, ownerHash)
  const reported = useRef(new Set<number>())

  // The mutation object is new every render; holding it in a ref keeps it out
  // of the dependency list without re-running the effect on each keystroke.
  const markReadRef = useRef(markRead)
  markReadRef.current = markRead

  useEffect(() => {
    for (const message of messages) {
      if (reported.current.has(message.id)) continue
      reported.current.add(message.id)
      markReadRef.current.mutate(message.id)
    }
  }, [messages])
}

interface ConversationViewProps {
  conversation: Conversation
  /** Present when the reader is the anonymous ticket owner. */
  ownerHash?: string
  /** Closed tickets are readable but not writable. */
  canReply: boolean
}

export function ConversationView({
  conversation,
  ownerHash,
  canReply,
}: ConversationViewProps) {
  const [draft, setDraft] = useState("")

  const messages = useQuery(messagesQueryOptions(conversation.id, ownerHash))
  const sendMessage = useSendMessage(conversation.id, ownerHash)

  const items = messages.data?.items ?? []

  useReadReceipts(conversation.id, items, ownerHash)

  return (
    <Card className="space-y-4 p-4">
      {conversation.sg_member && (
        <p className="text-sm text-muted-foreground">
          Handled by {conversation.sg_member.name}{" "}
          {conversation.sg_member.surname}
        </p>
      )}

      {messages.isPending ? (
        <SkeletonLines count={3} />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No replies yet. Student Government has been notified.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ul>
      )}

      {canReply && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const body = draft.trim()
            if (!body) return

            sendMessage.mutate(body, {
              // Cleared only once the send succeeded — a failed send that also
              // ate the message would be worse than the failure.
              onSuccess: () => {
                setDraft("")
              },
            })
          }}
          className="space-y-2"
        >
          <label
            htmlFor={`reply-${String(conversation.id)}`}
            className="sr-only"
          >
            Write a reply
          </label>
          <Textarea
            id={`reply-${String(conversation.id)}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            placeholder="Write a reply…"
            rows={3}
          />

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={sendMessage.isPending || draft.trim().length === 0}
            >
              {sendMessage.isPending ? (
                <Loader2 className="animate-spin" aria-hidden />
              ) : (
                <Send aria-hidden />
              )}
              Send
            </Button>

            {sendMessage.isError && (
              <span className="text-sm text-destructive" role="alert">
                Could not send that. Your message is still here — try again.
              </span>
            )}
          </div>
        </form>
      )}
    </Card>
  )
}
