import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"

import type { EventsListSearch } from "@/routes/_app/events"
import type { Event } from "@/lib/events"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage } from "@/lib/events"
import { EventCard } from "@/components/routes/events/components/event-card"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { EVENT_TYPES, type EventType } from "@/lib/events"
import { useDebounced } from "@/hooks/use-debounced"
import { TelegramConnectPrompt } from "@/components/routes/profile/components/telegram-connect-prompt"
import {
  ChoiceChips,
  SearchFilter,
  type FilterOption,
} from "@/components/shared/list-filters"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { PageHeader } from "@/components/shared/page/header"
import { Button } from "@/components/ui/button"

export function Page({
  search,
  onSearchChange,
  onEventCreated,
  onSelectTime,
}: {
  search: EventsListSearch
  onSearchChange: (
    updater: (previous: EventsListSearch) => EventsListSearch,
    replace?: boolean
  ) => void
  onEventCreated: (event: Event) => void
  onSelectTime: (next: EventsListSearch["time"] | undefined) => void
}) {
  const { time, type, q } = search
  const [searchInput, setSearchInput] = useState(q ?? "")
  const debouncedSearch = useDebounced(searchInput)
  const filters = { time_filter: time, event_type: type, keyword: q }

  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setSearchInput(q ?? "")
  }, [q])

  useEffect(() => {
    onSearchChange(
      (previous) => ({
        ...previous,
        q: debouncedSearch || undefined,
      }),
      true
    )
  }, [debouncedSearch, onSearchChange])

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

      <PageHeader
        title="Events"
        description="Find what's happening across campus."
        actions={
          // No role check: the backend lets any signed-in user create an event
          // for themselves, and this route is already behind the auth guard.
          <Button
            onClick={() => {
              setIsCreating(true)
            }}
          >
            <PlusIcon aria-hidden />
            Create event
          </Button>
        }
      />

      <div className="space-y-3">
        <SearchFilter
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search events"
        />
        <ChoiceChips
          label="Time period"
          value={time}
          options={TIME_OPTIONS}
          onChange={onSelectTime}
        />
        <ChoiceChips
          label="Event type"
          value={type}
          options={EVENT_TYPE_OPTIONS}
          onChange={(next) => {
            onSearchChange((previous) => ({ ...previous, type: next }))
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
          <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rendered}
          </div>
        )}
      </InfiniteList>

      <EventFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        // Straight to the new event: it may not be on the current page of a
        // filtered list, and "nothing visibly happened" is the worse outcome.
        onSaved={onEventCreated}
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
