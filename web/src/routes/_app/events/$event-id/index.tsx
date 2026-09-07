import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/events/$event-id"
import { eventDetailQueryOptions } from "@/lib/events"

export const Route = createFileRoute("/_app/events/$event-id/")({
  // Fetched during navigation rather than after render, so the page does not
  // flash a skeleton on an already-cached event.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      eventDetailQueryOptions(Number(params["event-id"]))
    ),
  component: EventDetailRoute,
})

function EventDetailRoute() {
  const eventId = Number(Route.useParams()["event-id"])

  return <Page eventId={eventId} />
}
