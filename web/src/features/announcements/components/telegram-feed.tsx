import { useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { ExternalLinkIcon } from "lucide-react"

import { telegramPostQueryOptions } from "@/features/announcements/api"
import { useTheme } from "@/components/theme-provider"
import { Skeleton } from "@/components/ui/skeleton"

const CHANNEL = "nuspacechannel"
const CHANNEL_URL = `https://t.me/${CHANNEL}`

function useResolvedDark(): boolean {
  const { theme } = useTheme()
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }
  return theme === "dark"
}

/**
 * Telegram's embed is a script that replaces itself with an iframe, so it has
 * to be injected rather than rendered. It bakes the colour scheme in at load,
 * hence re-injecting when the theme changes.
 */
function TelegramPost({ postId }: { postId: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDark = useResolvedDark()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const script = document.createElement("script")
    script.src = "https://telegram.org/js/telegram-widget.js?22"
    script.async = true
    script.setAttribute("data-telegram-post", `${CHANNEL}/${String(postId)}`)
    script.setAttribute("data-width", "100%")
    script.setAttribute("data-userpic", "false")
    if (isDark) script.setAttribute("data-dark", "1")

    container.appendChild(script)
    return () => {
      container.replaceChildren()
    }
  }, [postId, isDark])

  return <div ref={containerRef} className="w-full" />
}

export function TelegramFeed() {
  const query = useQuery(telegramPostQueryOptions)

  return (
    <section aria-labelledby="telegram-feed-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 id="telegram-feed-heading" className="text-xl font-semibold">
          Latest from Telegram
        </h2>
        <a
          href={CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View channel
          <ExternalLinkIcon className="size-4" aria-hidden />
        </a>
      </div>

      {query.isPending && <Skeleton className="h-96 w-full" />}

      {query.data && <TelegramPost postId={query.data.latest_post_id} />}

      {/* A missing channel feed should not read as a broken page. */}
      {query.isError && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load the channel.{" "}
          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open it in Telegram
          </a>
          .
        </p>
      )}
    </section>
  )
}
