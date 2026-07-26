import { useEffect, useState } from "react"
import { Link } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import { CheckIcon, ExternalLinkIcon, LinkIcon } from "lucide-react"

import { qk } from "@/api/query-keys"
import {
  useConnectTelegram,
  type TelegramBindChallenge,
} from "@/features/auth/connect-telegram"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** How often to re-check whether the bot has completed the binding. */
const POLL_INTERVAL_MS = 2000

/**
 * Watches for the link to complete while the dialog is open.
 *
 * The bot does the binding out-of-band, so nothing tells the page it happened —
 * polling is the only signal. Refetching the session query rather than hitting
 * /me directly means the whole app sees the result at once; the old version
 * fetched /me by hand and then separately asked the user hook to refresh.
 */
function useAwaitTelegramLink(active: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!active) return undefined

    const id = setInterval(() => {
      void queryClient.refetchQueries({ queryKey: qk.session() })
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(id)
    }
  }, [active, queryClient])
}

function ChallengeDialog({
  challenge,
  onClose,
}: {
  challenge: TelegramBindChallenge
  onClose: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link your Telegram</DialogTitle>
          <DialogDescription>
            Nuspace sends notifications through the bot, so linking is how you
            hear about replies to your appeals.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <li className="space-y-2">
            <p className="font-medium">1. Open the bot</p>
            <Button
              variant="outline"
              className="w-full"
              render={
                <a
                  href={challenge.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Telegram
                  <ExternalLinkIcon className="size-4" aria-hidden />
                </a>
              }
            />
          </li>

          <li className="space-y-2">
            <p className="font-medium">2. Tap this emoji when asked</p>
            <div className="grid place-items-center rounded-lg border border-border bg-muted/50 p-6">
              <span className="text-5xl" aria-hidden>
                {challenge.emoji}
              </span>
              <span className="sr-only">
                The confirmation emoji for this attempt
              </span>
            </div>
            <p className="text-muted-foreground">
              The bot shows ten animals in a random order. Only this one
              confirms the link.
            </p>
          </li>
        </ol>

        <p className="text-xs text-muted-foreground">
          This page updates on its own once the bot confirms. By linking you
          agree to the{" "}
          <Link to="/privacy-policy" className="underline">
            privacy policy
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Connect-Telegram control for the profile page.
 *
 * Shows linked state, or starts the deeplink challenge. Unlike the old button,
 * it does not hide itself when unlinked state is unknown — the caller decides
 * what to render, and this only handles the action.
 */
export function TelegramLink({
  sub,
  isLinked,
}: {
  sub: string
  isLinked: boolean
}) {
  const [challenge, setChallenge] = useState<TelegramBindChallenge | null>(null)
  const connect = useConnectTelegram()

  // Stop polling the moment the session reports a link, not just on close.
  const waiting = challenge !== null && !isLinked
  useAwaitTelegramLink(waiting)

  useEffect(() => {
    if (isLinked) setChallenge(null)
  }, [isLinked])

  if (isLinked) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <CheckIcon className="size-3.5" aria-hidden />
        Connected
      </Badge>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={connect.isPending}
        onClick={() => {
          connect.mutate(sub, { onSuccess: setChallenge })
        }}
      >
        <LinkIcon className="size-4" aria-hidden />
        {connect.isPending ? "Preparing…" : "Connect Telegram"}
      </Button>

      {connect.isError && (
        <p className="text-xs text-destructive">
          Could not start linking. Try again.
        </p>
      )}

      {challenge && (
        <ChallengeDialog
          challenge={challenge}
          onClose={() => {
            setChallenge(null)
          }}
        />
      )}
    </div>
  )
}
