import { useMemo, useState } from "react"
import { PlusIcon, UsersIcon } from "lucide-react"

import type { EventsListSearch } from "@/routes/_app/events"
import type { Event } from "@/lib/events"
import { useInfiniteList } from "@/hooks/use-infinite-list"
import { qk } from "@/api/query-keys"
import { fetchEventsPage, getEventTimeRange } from "@/lib/events"
import { EventCard } from "@/components/routes/events/components/event-card"
import { EventFormDialog } from "@/components/routes/events/components/event-form-dialog"
import { TelegramConnectPrompt } from "@/components/routes/profile/components/telegram-connect-prompt"
import { EmptyState } from "@/components/shared/query/boundary"
import { InfiniteList } from "@/components/shared/query/infinite-list"
import { FilterBar } from "@/components/shared/list-filters"
import { CardGrid } from "@/components/shared/page/card-grid"
import { PageContainer } from "@/components/shared/page/container"
import { PageHeader } from "@/components/shared/page/header"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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
    <PageContainer maxWidth="wide" className="space-y-6">
      <TelegramConnectPrompt
        storageKey="nuspace_events_tg_banner_dismissed"
        title="Connect Telegram for event updates"
      />

      <PageHeader
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
      />

      <FilterBar className="flex flex-wrap items-center gap-2 space-y-0">
        <ButtonGroup>
          {TIME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={time === option.value ? "default" : "outline"}
              onClick={() => {
                onSelectTime(option.value)
              }}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
        <Button
          variant={type === "recruitment" ? "default" : "outline"}
          className={cn(type !== "recruitment" && "bg-background")}
          onClick={() => {
            onSearchChange((previous) => ({
              ...previous,
              type: previous.type === "recruitment" ? undefined : "recruitment",
            }))
          }}
        >
          <UsersIcon aria-hidden /> Club Recruitments
        </Button>
      </FilterBar>

      <InfiniteList
        items={list.items}
        getKey={(event) => event.id}
        renderItem={(event) => <EventCard event={event} />}
        isPending={list.isPending}
        pending={<EventGridSkeleton />}
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
    </PageContainer>
  )
}

const TIME_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const

function EventGridSkeleton() {
  return (
    <CardGrid columns={4} aria-hidden>
      {Array.from({ length: 8 }, (_, index) => (
        <Card key={index} className="gap-0 p-0">
          <Skeleton className="aspect-3/4 w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </Card>
      ))}
    </CardGrid>
  )
}
