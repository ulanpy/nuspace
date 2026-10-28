import {
  Outlet,
  createFileRoute,
  redirect,
  stripSearchParams,
} from "@tanstack/react-router"
import { useCallback } from "react"
import { z } from "zod"

import { EventsScreen } from "@/components/routes/events"

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

/**
 * The events host: the board, with `/$eventId` as a dialog over it.
 *
 * The board lives here rather than in the index route so that it stays
 * mounted when an event opens or closes. Its loaded pages, its filters and
 * its scroll position are never torn down and rebuilt; the child route only
 * adds or removes the dialog through the `<Outlet />`.
 */
export const Route = createFileRoute("/_app/events")({
  validateSearch: eventsSearchSchema,
  search: {
    // Keeps the default out of the address: an event opens at `/42`, not
    // `/42?time=upcoming`.
    middlewares: [stripSearchParams({ time: "upcoming" })],
  },
  beforeLoad: ({ search }) => {
    if (search.id !== undefined) {
      throw redirect({
        to: "/events/$eventId",
        params: { eventId: String(search.id) },
      })
    }
  },
  component: EventsBoardRoute,
})

function EventsBoardRoute() {
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
    <>
      <EventsScreen
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
            to: "/events/$eventId",
            params: { eventId: String(event.id) },
            search: (previous) => previous,
            resetScroll: false,
          })
        }}
      />
      <Outlet />
    </>
  )
}
