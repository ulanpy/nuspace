import { createFileRoute } from "@tanstack/react-router"
import { MessagesSquareIcon } from "lucide-react"

import { useSession } from "@/features/auth/use-session"
import { OtinishStats } from "@/features/sgotinish/components/otinish-stats"
import { TelegramConnectPrompt } from "@/features/profile/components/telegram-connect-prompt"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const BOT_USERNAME =
  (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? "nuspacebot").replace(
    /^@/,
    ""
  ) || "nuspacebot"
const OTINISH_DEEPLINK = `https://t.me/${BOT_USERNAME}?start=otinish`

const STEPS = [
  {
    title: "Ask",
    body: "Open the bot, pick a topic, and write what's going on — in your own words.",
  },
  {
    title: "SG gets it — anonymously",
    body: "Student Government sees the appeal, not your name or profile. No need to find who to ping.",
  },
  {
    title: "Chat until it's done",
    body: "While the channel is open, just type in the bot — messages go to SG. Send /close when you're finished.",
  },
] as const

export const Route = createFileRoute("/_app/sgotinish/")({
  component: SGotinishPage,
})

function SGotinishPage() {
  // useSession so the Telegram prompt can react to tg_id changing after a link.
  const session = useSession()

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <PageHeader
        eyebrow="Student Government"
        title="SG otinish"
        description="Ask Student Government anonymously in Telegram — they see the issue, not who you are, and reply in the same chat."
      />

      <OtinishStats />

      <ol className="relative space-y-0">
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
            {index < STEPS.length - 1 && (
              <span
                className="absolute top-9 bottom-0 left-[15px] w-px bg-border"
                aria-hidden
              />
            )}
            <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {session && session.tg_id === null && (
        <TelegramConnectPrompt
          storageKey="nuspace_sgotinish_tg_prompt_dismissed"
          title="Get appeal updates on Telegram"
        />
      )}

      <Card className="space-y-3 p-4">
        <Button
          size="lg"
          className="w-full gap-2"
          render={
            <a
              href={OTINISH_DEEPLINK}
              target="_blank"
              rel="noreferrer"
            >
              <MessagesSquareIcon className="size-5" aria-hidden />
              Ask in Telegram
            </a>
          }
        />
        <p className="text-center text-xs text-muted-foreground">
          @{BOT_USERNAME} · category, then one message
        </p>
      </Card>
    </div>
  )
}
