import type { ReactNode } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowRightIcon, CalendarIcon, UsersIcon } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { LinkProps } from "@tanstack/react-router"

import { announcementsBundleQueryOptions } from "@/features/announcements/api"
import { TelegramFeed } from "@/features/announcements/components/telegram-feed"
import { EventCard } from "@/features/events/components/event-card"
import type { Event } from "@/features/events/types"
import { useCurrentUser } from "@/features/auth/use-session"

export const Route = createFileRoute("/_app/announcements")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(announcementsBundleQueryOptions),
  component: Announcements,
})

function greeting(hour = new Date().getHours()): string {
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function Section({
  title,
  viewAllTo,
  viewAllSearch,
  children,
}: {
  title: string
  viewAllTo: LinkProps["to"]
  viewAllSearch?: LinkProps["search"]
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link
          to={viewAllTo}
          search={viewAllSearch}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          View all
          <ArrowRightIcon className="size-4" aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  )
}

function EventGrid({
  events,
  icon: Icon,
  emptyLabel,
}: {
  events: Event[]
  icon: LucideIcon
  emptyLabel: string
}) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <Icon className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-muted-foreground">{emptyLabel}</p>
        <Link
          to="/events"
          className="text-sm font-medium text-primary hover:underline"
        >
          Browse all events
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

function Announcements() {
  const user = useCurrentUser()
  const { data: bundle } = useSuspenseQuery(announcementsBundleQueryOptions)

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}, {user.given_name}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening at Nuspace
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <Section title="Current Events" viewAllTo="/events">
            <EventGrid
              events={bundle.events.items ?? []}
              icon={CalendarIcon}
              emptyLabel="No upcoming events"
            />
          </Section>

          <Section
            title="Now Recruiting"
            viewAllTo="/events"
            viewAllSearch={{ time: "upcoming", type: "recruitment" }}
          >
            <EventGrid
              events={bundle.recruitment_events.items ?? []}
              icon={UsersIcon}
              emptyLabel="No recruitment events right now"
            />
          </Section>
        </div>

        <TelegramFeed />
      </div>
    </div>
  )
}
