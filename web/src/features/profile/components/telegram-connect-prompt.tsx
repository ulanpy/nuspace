import { useState } from "react"
import { SendIcon, XIcon } from "lucide-react"

import { useSession } from "@/features/auth/use-session"
import { TelegramLink } from "@/features/profile/components/telegram-link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function TelegramConnectPrompt({
  storageKey,
  title,
}: {
  storageKey: string
  title: string
}) {
  const session = useSession()
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(storageKey) === "1"
  )

  if (!session || session.tg_id !== null || dismissed) return null

  return (
    <Card className="flex flex-wrap items-center gap-3 border-primary/30 bg-primary/5 p-4">
      <SendIcon className="size-5 text-primary" aria-hidden />
      <div className="min-w-48 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Link Telegram to receive Nuspace notifications and updates.
        </p>
      </div>
      <TelegramLink sub={session.user.sub} isLinked={false} />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss Telegram prompt"
        onClick={() => {
          localStorage.setItem(storageKey, "1")
          setDismissed(true)
        }}
      >
        <XIcon aria-hidden />
      </Button>
    </Card>
  )
}
