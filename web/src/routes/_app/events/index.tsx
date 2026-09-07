import { createFileRoute, redirect } from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { Page } from "@/components/routes/events"

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

export type EventsListSearch = z.infer<typeof eventsSearchSchema>

export const Route = createFileRoute("/_app/events/")({
  validateSearch: eventsSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.id !== undefined) {
      throw redirect({
        to: "/events/$event-id",
        params: { "event-id": String(search.id) },
      })
    }
  },
  component: EventsListRoute,
})

function EventsListRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (
      updater: (previous: EventsListSearch) => EventsListSearch,
      replace = false
    ) => {
      void navigate({
        search: updater,
        replace,
      })
    },
    [navigate]
  )

  return (
    <Page
      search={search}
      onSearchChange={onSearchChange}
      onSelectTime={(next) => {
        void navigate({
          search: (previous) => ({
            ...previous,
            time: next ?? "upcoming",
          }),
        })
      }}
      onEventCreated={(event) => {
        void navigate({
          to: "/events/$event-id",
          params: { "event-id": String(event.id) },
        })
      }}
    />
  )
}
