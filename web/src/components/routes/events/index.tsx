import { useMemo, useState } from "react"

import type { EventsListSearch } from "@/routes/_app/events"
import type { Event } from "@/lib/events"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage, getEventTimeRange } from "@/lib/events"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { EventPinboard } from "@/components/routes/events/components/pinboard"
import { Page } from "@/components/shared/page"
import { TelegramConnectPrompt } from "@/components/shared/telegram/connect-prompt"
import type { BoardFilterOption } from "@/components/routes/events/components/pinboard"

/**
 * The events host's root: a cork board of posters. Opening one goes to the
 * event's own route, `/$eventId`.
 */
export function EventsScreen({
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
    // No title: the board is the heading. `Page` still gives it the box.
    <Page>
      <TelegramConnectPrompt
        storageKey="nuspace_events_tg_banner_dismissed"
        title="Connect Telegram for event updates"
      />

      <EventPinboard
        events={list.items}
        title="Events"
        subtitle={
          list.isPending
            ? undefined
            : list.total === 1
              ? "1 on the board"
              : `${list.total} on the board`
        }
        time={time}
        timeOptions={TIME_OPTIONS}
        onTimeChange={onSelectTime}
        recruitmentOnly={type === "recruitment"}
        onRecruitmentOnlyChange={(pressed) => {
          onSearchChange((previous) => ({
            ...previous,
            type: pressed ? "recruitment" : undefined,
          }))
        }}
        // The backend remains authoritative for event creation.
        onCreate={() => {
          setIsCreating(true)
        }}
        isLoading={list.isPending}
        isError={list.isError}
        error={list.error}
        onRetry={() => {
          void list.refetch()
        }}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        onLoadMore={() => {
          void list.fetchNextPage()
        }}
      />

      <EventFormDialog
        open={isCreating}
        onOpenChange={setIsCreating}
        // Straight to the new event: it may not be on the current page of a
        // filtered list, and "nothing visibly happened" is the worse outcome.
        onSaved={onEventCreated}
      />
    </Page>
  )
}

const TIME_OPTIONS = [
  { value: "upcoming", label: "All upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] satisfies BoardFilterOption<NonNullable<EventsListSearch["time"]>>[]
