"use client";

import MotionWrapper from "@/components/shared/motion-wrapper";
import { useUser } from "@/hooks/use-user";
import { PageContainer } from "@/components/shared/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { BindTelegramButton } from "@/components/molecules/buttons/bind-telegram-button";
import { OtinishStats } from "@/features/sgotinish/components/otinish-stats";
import { ExternalLink, MessageCircle } from "lucide-react";

const BOT_USERNAME =
  import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.replace(/^@/, "") || "nuspacebot";
const OTINISH_DEEPLINK = `https://t.me/${BOT_USERNAME}?start=otinish`;

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
] as const;

export default function SgotinishPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <MotionWrapper>
      <PageContainer>
        <PageHeader
          title="SG Otinish"
          subtitle="Ask Student Government anonymously in Telegram — they see the issue, not who you are, and reply in the same chat."
        />

        <div className="mx-auto mt-10 max-w-lg space-y-12">
          <OtinishStats />

          <ol className="relative space-y-0">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative flex gap-4 pb-8 last:pb-0">
                {index < STEPS.length - 1 && (
                  <span
                    className="absolute left-[15px] top-9 bottom-0 w-px bg-border"
                    aria-hidden
                  />
                )}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-semibold text-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {user && !user.tg_id && (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <p>
                Link Telegram to your nuspace account first — otherwise the bot
                can’t start an appeal.
              </p>
              <BindTelegramButton />
            </div>
          )}

          <div className="space-y-3">
            <Button asChild size="lg" className="w-full gap-2">
              <a href={OTINISH_DEEPLINK} target="_blank" rel="noreferrer">
                <MessageCircle className="h-5 w-5" />
                Ask in Telegram
                <ExternalLink className="h-4 w-4 opacity-70" />
              </a>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              @{BOT_USERNAME} · category, then one message
            </p>
          </div>
        </div>
      </PageContainer>
    </MotionWrapper>
  );
}
