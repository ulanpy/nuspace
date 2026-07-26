import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { CalendarIcon, MapPinIcon, UserIcon } from "lucide-react"

import { eventDetailQueryOptions } from "@/features/events/api"
import { selectMedia } from "@/features/media/select"
import { formatCampusDateTime, formatRelative, isPast } from "@/lib/datetime"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_app/events/$eventId")({
  // Fetched during navigation rather than after render, so the page does not
  // flash a skeleton on an already-cached event.
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      eventDetailQueryOptions(Number(params.eventId))
    ),
  component: EventDetail,
})

function EventDetail() {
  const { eventId } = Route.useParams()
  const { data: event } = useSuspenseQuery(
    eventDetailQueryOptions(Number(eventId))
  )

  const poster = selectMedia(event.media, "carousel")
  const started = isPast(event.start_datetime)
  const finished = isPast(event.end_datetime)

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {poster && (
        // object-contain, not cover: the poster is usually the flyer, and
        // cropping it can cut off details that appear nowhere else on the page.
        <img
          src={poster.url}
          alt={`Poster for ${event.name}`}
          className="aspect-[3/4] w-full max-w-xs rounded-lg bg-muted object-contain"
        />
      )}

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{event.type}</Badge>
          {event.tag !== "regular" && <Badge>{event.tag}</Badge>}
          {finished ? (
            <Badge variant="outline">Finished</Badge>
          ) : (
            <Badge variant="outline">
              {started ? "Happening now" : formatRelative(event.start_datetime)}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-balance">
          {event.name}
        </h1>
      </header>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3">
          <CalendarIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">When</dt>
            <dd className="text-sm text-muted-foreground">
              {formatCampusDateTime(event.start_datetime)} –{" "}
              {formatCampusDateTime(event.end_datetime, {
                timeStyle: "short",
              })}
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <MapPinIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">Where</dt>
            <dd className="text-sm text-muted-foreground">{event.place}</dd>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <UserIcon
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <dt className="text-sm font-medium">Organizer</dt>
            <dd className="text-sm text-muted-foreground">
              {event.creator.name} {event.creator.surname}
            </dd>
          </div>
        </div>
      </dl>

      {event.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="whitespace-pre-line text-muted-foreground">
            {event.description}
          </p>
        </div>
      )}

      {event.policy === "registration" &&
        event.registration_link &&
        !finished && (
          <Button
            render={
              <a
                href={event.registration_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register
              </a>
            }
          />
        )}
    </article>
  )
}
