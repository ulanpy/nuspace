import { useState } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { z } from "zod"

import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage } from "@/features/events/api"
import { EventCard } from "@/features/events/components/event-card"
import { EventFormDialog } from "@/features/events/components/event-form-dialog"
import { EmptyState } from "@/components/query-boundary"
import { InfiniteList } from "@/components/infinite-list"
import { Button } from "@/components/ui/button"

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
  const navigate = useNavigate()

  const [isCreating, setIsCreating] = useState(false)

  const list = useInfiniteList({
    queryKey: qk.events.list(filters),
    fetchPage: (page) => fetchEventsPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Events</h1>

        {/* No role check: the backend lets any signed-in user create an event
            for themselves, and this route is already behind the auth guard. */}
        <Button
          onClick={() => {
            setIsCreating(true)
          }}
        >
          <PlusIcon aria-hidden />
          Create event
        </Button>
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
          /* items-start, or a card with a poster stretches every other card in
             its row to the same height and leaves a column of empty space. */
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rendered}
          </div>
        )}
      </InfiniteList>

      <EventFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        // Straight to the new event: it may not be on the current page of a
        // filtered list, and "nothing visibly happened" is the worse outcome.
        onSaved={(event) => {
          void navigate({
            to: "/events/$eventId",
            params: { eventId: String(event.id) },
          })
        }}
      />
    </div>
  )
}
