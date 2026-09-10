import { createFileRoute } from "@tanstack/react-router"

import { Page } from "@/components/routes/events/$eventId"
import { eventDetailQueryOptions } from "@/lib/events"

export const Route = createFileRoute("/_app/events/$eventId/")({
  // Fetched during navigation rather than after render, so the page does not
  // flash a skeleton on an already-cached event.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      eventDetailQueryOptions(Number(params.eventId))
    ),
  component: EventDetailRoute,
})

function EventDetailRoute() {
  const eventId = Number(Route.useParams().eventId)

  return <Page eventId={eventId} />
}
