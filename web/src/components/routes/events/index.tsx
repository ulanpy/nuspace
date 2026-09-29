import { useMemo, useState } from "react"
import { PlusIcon, UsersIcon } from "lucide-react"

import type { EventsListSearch } from "@/routes/_app/events"
import type { Event } from "@/lib/events"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage, getEventTimeRange } from "@/lib/events"
import { EventCard } from "@/components/routes/events/components/event-card"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { TelegramConnectPrompt } from "@/components/shared/telegram/connect-prompt"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { FilterTabs, type FilterOption } from "@/components/shared/list-filters"
import { CardGrid, CardGridSkeleton } from "@/components/shared/page/card-grid"
import { Page as PageLayout } from "@/components/shared/page"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"

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
  const { time, type } = search
  // The range contains a timestamp for "upcoming". Memoising prevents a new
  // query key on every render, which otherwise restarts the infinite query.
  const filters = useMemo(
    () => ({ ...getEventTimeRange(time), event_type: type }),
    [time, type]
  )

  const [isCreating, setIsCreating] = useState(false)

  const list = useInfiniteList({
    queryKey: qk.events.list(filters),
    fetchPage: (page) => fetchEventsPage(filters, page),
  })

  return (
    <PageLayout
      title="Events"
      description="Find what's happening across campus."
      actions={
        // The backend remains authoritative for event creation.
        <Button
          onClick={() => {
            setIsCreating(true)
          }}
        >
          <PlusIcon aria-hidden />
          Create event
        </Button>
      }
    >
      <TelegramConnectPrompt
        storageKey="nuspace_events_tg_banner_dismissed"
        title="Connect Telegram for event updates"
      />

      <div className="flex flex-wrap items-center gap-2">
        <FilterTabs
          label="Event time range"
          value={time}
          options={TIME_OPTIONS}
          showAll={false}
          onChange={onSelectTime}
        />
        <Toggle
          variant="outline"
          pressed={type === "recruitment"}
          onPressedChange={(pressed) => {
            onSearchChange((previous) => ({
              ...previous,
              type: pressed ? "recruitment" : undefined,
            }))
          }}
        >
          <UsersIcon aria-hidden /> Club Recruitments
        </Toggle>
      </div>

      <InfiniteList
        items={list.items}
        getKey={(event) => event.id}
        renderItem={(event) => <EventCard event={event} />}
        isPending={list.isPending}
        pending={<CardGridSkeleton columns={4} count={8} variant="banner" />}
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
        {(rendered) => <CardGrid columns={4}>{rendered}</CardGrid>}
      </InfiniteList>

      <EventFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        // Straight to the new event: it may not be on the current page of a
        // filtered list, and "nothing visibly happened" is the worse outcome.
        onSaved={onEventCreated}
      />
    </PageLayout>
  )
}

const TIME_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] satisfies FilterOption<NonNullable<EventsListSearch["time"]>>[]
