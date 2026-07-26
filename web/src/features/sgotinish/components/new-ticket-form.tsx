import { useState } from "react"
import { Copy, EyeOff, Loader2, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useCreateTicket } from "../api"
import { TICKET_CATEGORIES, type TicketCategory } from "../types"
import { deriveOwnerHash, generateWarpKey, warpKeyLink } from "../warp-key"

/**
 * Shown once, after an anonymous ticket is created.
 *
 * This link is the only way back to the ticket. The server holds a hash of the
 * key and nothing else, so it genuinely cannot be recovered — the warning is
 * literal, not boilerplate.
 */
function WarpKeyHandoff({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <Card className="space-y-3 border-warning p-4">
      <div>
        <h3 className="font-semibold">Save this link now</h3>
        <p className="text-sm text-muted-foreground">
          It is the only way to reopen your ticket and read replies. We store
          only a fingerprint of it, so if you lose it nobody — including us —
          can get the ticket back.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          readOnly
          value={link}
          className="min-w-0 flex-1 font-mono text-xs"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(link).then(() => {
              setCopied(true)
            })
          }}
        >
          <Copy aria-hidden />
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Keep the complete link somewhere private. For anonymity, this browser
        does not store a separate copy of its secret key.
      </p>
    </Card>
  )
}

export function NewTicketForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState<TicketCategory>("academic")
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [handoffLink, setHandoffLink] = useState<string | null>(null)

  const createTicket = useCreateTicket()

  if (handoffLink) {
    return (
      <div className="space-y-3">
        <WarpKeyHandoff link={handoffLink} />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setHandoffLink(null)
          }}
        >
          Done
        </Button>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true)
        }}
      >
        <Plus aria-hidden />
        Raise a ticket
      </Button>
    )
  }

  return (
    <Card className="space-y-4 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault()

          void (async () => {
            // The key is generated here and never sent: only its hash goes to
            // the server, so nothing server-side can reconstruct it.
            const key = isAnonymous ? generateWarpKey() : null
            const ownerHash = key ? await deriveOwnerHash(key) : undefined

            createTicket.mutate(
              {
                category,
                title: title.trim(),
                body: body.trim(),
                is_anonymous: isAnonymous,
                owner_hash: ownerHash,
              },
              {
                onSuccess: () => {
                  setTitle("")
                  setBody("")
                  setIsOpen(false)

                  if (key) {
                    setHandoffLink(warpKeyLink(key, window.location.origin))
                  }
                },
              }
            )
          })()
        }}
        className="space-y-4"
      >
        <div className="space-y-1">
          <Label htmlFor="ticket-title">Title</Label>
          <Input
            id="ticket-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
            }}
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ticket-category">Category</Label>
          <Select
            value={category}
            onValueChange={(value) => {
              if (value) setCategory(value)
            }}
          >
            <SelectTrigger id="ticket-category" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TICKET_CATEGORIES.map((option) => (
                <SelectItem key={option} value={option} className="capitalize">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="ticket-body">Details</Label>
          <Textarea
            id="ticket-body"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
            }}
            rows={5}
            required
          />
        </div>

        <div className="flex items-start gap-2 text-sm">
          <input
            id="ticket-anonymous"
            type="checkbox"
            checked={isAnonymous}
            onChange={(event) => {
              setIsAnonymous(event.target.checked)
            }}
            className="mt-1"
          />
          <label htmlFor="ticket-anonymous">
            <span className="flex items-center gap-1 font-medium">
              <EyeOff className="size-3.5" aria-hidden />
              Send anonymously
            </span>
            <span className="text-muted-foreground">
              Your name is not attached and Student Government cannot see who
              sent it. You will get a private link — without it the ticket
              cannot be reopened, and it will not appear in your ticket list.
            </span>
          </label>
        </div>

        {createTicket.isError && (
          <p className="text-sm text-destructive" role="alert">
            Could not create that ticket. Nothing was sent — try again.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={createTicket.isPending}>
            {createTicket.isPending && (
              <Loader2 className="animate-spin" aria-hidden />
            )}
            Send to Student Government
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setIsOpen(false)
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}
