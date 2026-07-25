import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage } from "@/features/events/api"
import { EventCard } from "@/features/events/components/event-card"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"

const eventsSearchSchema = z.object({
  time: z.enum(["upcoming", "today", "week", "month"]).default("upcoming"),
  type: z
    .enum([
      "academic",
      "professional",
      "recreational",
      "cultural",
      "sports",
      "social",
      "art",
      "recruitment",
    ])
    .optional(),
  q: z.string().optional(),
  /**
   * Legacy. Shared links use /events?id=123; beforeLoad rewrites them to the
   * path form so old URLs keep working.
   */
  id: z.coerce.number().optional(),
})

export const Route = createFileRoute("/_app/events/")({
  validateSearch: eventsSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.id !== undefined) {
      throw redirect({
        to: "/events/$eventId",
        params: { eventId: String(search.id) },
      })
    }
  },
  component: EventsList,
})

function EventsList() {
  const { time, type, q } = Route.useSearch()
  const filters = { time_filter: time, event_type: type, keyword: q }

  const list = useInfiniteList({
    queryKey: qk.events.list(filters),
    fetchPage: (page) => fetchEventsPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>
      </header>

      <InfiniteList
        items={list.items}
        getKey={(event) => event.id}
        renderItem={(event) => <EventCard event={event} />}
        isPending={list.isPending}
        isError={list.isError}
        error={list.error}
        refetch={() => {
          void list.refetch()
        }}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        fetchNextPage={() => {
          void list.fetchNextPage()
        }}
        empty={
          <EmptyState
            title="No events"
            description="Nothing scheduled for this period yet."
          />
        }
      >
        {(rendered) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rendered}
          </div>
        )}
      </InfiniteList>
    </div>
  )
}
