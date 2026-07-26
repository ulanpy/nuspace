import { useEffect, useState } from "react"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { z } from "zod"

import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage } from "@/features/events/api"
import { EventCard } from "@/features/events/components/event-card"
import { EventFormDialog } from "@/features/events/components/event-form-dialog"
import { EVENT_TYPES, type EventType } from "@/features/events/types"
import { useDebounced } from "@/hooks/use-debounced"
import { TelegramConnectPrompt } from "@/features/profile/components/telegram-connect-prompt"
import {
  ChoiceChips,
  SearchFilter,
  type FilterOption,
} from "@/components/list-filters"
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
  const [search, setSearch] = useState(q ?? "")
  const debouncedSearch = useDebounced(search)
  const filters = { time_filter: time, event_type: type, keyword: q }
  const navigate = Route.useNavigate()

  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setSearch(q ?? "")
  }, [q])

  useEffect(() => {
    void navigate({
      search: (previous) => ({
        ...previous,
        q: debouncedSearch || undefined,
      }),
      replace: true,
    })
  }, [debouncedSearch, navigate])

  const list = useInfiniteList({
    queryKey: qk.events.list(filters),
    fetchPage: (page) => fetchEventsPage(filters, page),
  })

  return (
    <div className="space-y-6">
      <TelegramConnectPrompt
        storageKey="nuspace_events_tg_banner_dismissed"
        title="Publish and follow campus events through Telegram"
      />

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

      <div className="space-y-3">
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search events"
        />
        <ChoiceChips
          label="Time period"
          value={time}
          options={TIME_OPTIONS}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({
                ...previous,
                time: next ?? "upcoming",
              }),
            })
          }}
        />
        <ChoiceChips
          label="Event type"
          value={type}
          options={EVENT_TYPE_OPTIONS}
          onChange={(next) => {
            void navigate({
              search: (previous) => ({ ...previous, type: next }),
            })
          }}
        />
      </div>

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

const TIME_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const satisfies readonly FilterOption<
  "upcoming" | "today" | "week" | "month"
>[]

const EVENT_TYPE_OPTIONS = EVENT_TYPES.map((value) => ({
  value,
  label: value === "recruitment" ? "Recruiting" : titleCase(value),
})) satisfies FilterOption<EventType>[]

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
