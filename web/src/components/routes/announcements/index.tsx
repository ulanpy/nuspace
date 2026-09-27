import { Link } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowRightIcon, CalendarIcon } from "lucide-react"

import { announcementsBundleQueryOptions } from "@/lib/announcements"
import { TelegramFeed } from "@/components/routes/announcements/components/telegram-feed"
import { AnnouncementFeaturedEvent } from "@/components/routes/announcements/components/featured-event"
import { EventPosterStrip } from "@/components/routes/announcements/components/event-poster-strip"

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function Page() {
  const { data: bundle } = useSuspenseQuery(announcementsBundleQueryOptions)
  const events = bundle.events.items ?? []
  const featured =
    events.find((event) => {
      const now = Date.now()
      return (
        event.type !== "recruitment" &&
        new Date(event.start_datetime).getTime() <= now &&
        new Date(event.end_datetime).getTime() > now
      )
    }) ?? events[0]
  const remainingEvents = events.filter((event) => event.id !== featured?.id)

  return (
    <div className="space-y-8">
      <header className="min-w-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          {greeting()}, there!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at Nuspace
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Coming Up Next</h2>
            <Link
              to="/events"
              className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              View all
              <ArrowRightIcon className="size-4" aria-hidden />
            </Link>
          </div>

          {featured ? (
            <>
              <AnnouncementFeaturedEvent event={featured} />
              {remainingEvents.length > 0 && (
                <div className="border-t border-border pt-6">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    More upcoming
                  </p>
                  <EventPosterStrip events={remainingEvents.slice(0, 10)} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
              <CalendarIcon
                className="size-8 text-muted-foreground"
                aria-hidden
              />
              <p className="text-muted-foreground">No upcoming announcements</p>
              <Link
                to="/events"
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse all events
              </Link>
            </div>
          )}
        </section>

        <TelegramFeed />
      </div>
    </div>
  )
}
