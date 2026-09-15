import { Link } from "@tanstack/react-router"
import {
  CalendarIcon,
  MapPinIcon,
} from "lucide-react"

import type { Event } from "@/lib/events"
import { eventPolicyLabel, getEventTiming } from "@/lib/events"
import { selectMedia } from "@/lib/media/functions"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { formatCampusDateTime } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

/**
 * `poster` leads with the full flyer and suits browsing /events.
 *
 * `row` is for summaries. Posters are portrait by convention (the upload
 * guidance asks for 3:4), so at a phone width a poster card is over 500px tall
 * — one event fills the screen and "here's what's happening" becomes a single
 * image you have to scroll past. A thumbnail beside the text keeps several
 * events visible at once.
 */
type EventCardVariant = "poster" | "row"

interface EventCardProps {
  event: Event
  variant?: EventCardVariant
}

function EventMeta({ event }: { event: Event }) {
  const isRecruitment = event.type === "recruitment"

  return (
    <dl className="space-y-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <dt className="sr-only">{isRecruitment ? "Deadline" : "Starts"}</dt>
        <CalendarIcon className="size-4 shrink-0" aria-hidden />
        <dd>
          {isRecruitment ? "Deadline: " : ""}
          {formatCampusDateTime(
            isRecruitment ? event.end_datetime : event.start_datetime
          )}
        </dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="sr-only">Place</dt>
        <MapPinIcon className="size-4 shrink-0" aria-hidden />
        <dd className="truncate">{event.place}</dd>
      </div>
    </dl>
  )
}

export function EventCard({ event, variant = "poster" }: EventCardProps) {
  const poster = selectMedia(event.media, "carousel")
  const now = useMinuteNow()
  const timing = getEventTiming(event.start_datetime, event.end_datetime, now, event.type)

  const badges = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary">{event.type}</Badge>
      <Badge variant={timing.kind === "ongoing" ? "default" : "outline"}>
        {timing.label}
        {timing.kind === "upcoming" ? " " : " · "}
        {timing.detail}
      </Badge>
    </div>
  )

  const title = (
    <h3 className="leading-snug font-semibold text-balance">{event.name}</h3>
  )

  if (variant === "row") {
    return (
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
        <Link
          to="/events/$eventId"
          params={{ eventId: String(event.id) }}
          className="flex min-h-32 gap-3 p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <ResilientImage
            src={poster?.url}
            alt={`Poster for ${event.name}`}
            containerClassName="aspect-[3/4] w-20 shrink-0 rounded-md sm:w-24"
            fallback={
              <span className="grid size-full place-items-center text-muted-foreground">
                <CalendarIcon className="size-7" aria-hidden />
                <span className="sr-only">No poster available</span>
              </span>
            }
          />
          <div className="min-w-0 space-y-1.5">
            {badges}
            {title}
            <EventMeta event={event} />
          </div>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-md">
      <Link
        to="/events/$eventId"
        params={{ eventId: String(event.id) }}
        className="flex h-full flex-col focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-3/4 overflow-hidden bg-muted">
          <ResilientImage
            src={poster?.url}
            alt={`Poster for ${event.name}`}
            containerClassName="size-full"
            fallback={
              <span className="grid size-full place-items-center text-center text-muted-foreground">
                <span className="space-y-2">
                  <CalendarIcon
                    className="mx-auto size-10 opacity-60"
                    aria-hidden
                  />
                  <span className="block text-xs">No poster available</span>
                </span>
              </span>
            }
          />

          <Badge
            variant="secondary"
            className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm"
          >
            {eventPolicyLabel(event.policy)}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col space-y-2 p-4">
          {badges}
          {title}
          <div className="mt-auto">
            <EventMeta event={event} />
          </div>
        </div>
      </Link>
    </Card>
  )
}
