import { createFileRoute } from "@tanstack/react-router"

import { EventDetailScreen } from "@/components/routes/events/$eventId"
import { EventUnavailableDialog } from "@/components/routes/events/components/event-dialog"
import { useCloseEventDialog } from "@/components/routes/events/components/use-close-event-dialog"
import { eventDetailQueryOptions } from "@/lib/events"

export const Route = createFileRoute("/_app/events/$eventId/")({
  // Fetched during navigation rather than after render, so the dialog does not
  // flash a skeleton on an already-cached event. A poster preloads it on hover.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      eventDetailQueryOptions(Number(params.eventId))
    ),
  component: EventDetailRoute,
  // The board stays up behind either of these.
  errorComponent: EventUnavailableRoute,
  notFoundComponent: EventUnavailableRoute,
})

function EventDetailRoute() {
  const eventId = Number(Route.useParams().eventId)

  return <EventDetailScreen eventId={eventId} />
}

function EventUnavailableRoute() {
  const close = useCloseEventDialog()

  return <EventUnavailableDialog onClose={close} />
}
