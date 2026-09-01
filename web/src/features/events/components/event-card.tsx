import { Link } from "@tanstack/react-router"
import {
  CalendarIcon,
  MapPinIcon,
  TicketCheckIcon,
  UserIcon,
} from "lucide-react"

import type { Event } from "@/features/events/types"
import {
  eventPolicyLabel,
  getEventTiming,
} from "@/features/events/presentation"
import { selectMedia } from "@/features/media/select"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { formatCampusDateTime } from "@/lib/datetime"
import { ResilientImage } from "@/components/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  return (
    <dl className="space-y-1 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <dt className="sr-only">Starts</dt>
        <CalendarIcon className="size-4 shrink-0" aria-hidden />
        <dd>{formatCampusDateTime(event.start_datetime)}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="sr-only">Place</dt>
        <MapPinIcon className="size-4 shrink-0" aria-hidden />
        <dd className="truncate">{event.place}</dd>
      </div>
      <div className="flex items-center gap-2">
        <dt className="sr-only">Entry policy</dt>
        <TicketCheckIcon className="size-4 shrink-0" aria-hidden />
        <dd>{eventPolicyLabel(event.policy)}</dd>
      </div>
    </dl>
  )
}

export function EventCard({ event, variant = "poster" }: EventCardProps) {
  const poster = selectMedia(event.media, "carousel")
  const now = useMinuteNow()
  const timing = getEventTiming(event.start_datetime, event.end_datetime, now)
  const organizerName = `${event.creator.name} ${event.creator.surname}`

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
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Avatar size="sm">
                {event.creator.picture && (
                  <AvatarImage src={event.creator.picture} alt="" />
                )}
                <AvatarFallback>
                  <UserIcon className="size-3" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <span className="truncate">by {organizerName}</span>
            </div>
          </div>
        </Link>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
      <Link
        to="/events/$eventId"
        params={{ eventId: String(event.id) }}
        className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
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
          <Avatar className="absolute right-2 bottom-2 ring-2 ring-background">
            {event.creator.picture && (
              <AvatarImage src={event.creator.picture} alt="" />
            )}
            <AvatarFallback>
              {event.creator.name.charAt(0)}
              {event.creator.surname.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-2 p-4">
          {badges}
          {title}
          <p className="truncate text-xs text-muted-foreground">
            by {organizerName}
          </p>
          <EventMeta event={event} />
        </div>
      </Link>
    </Card>
  )
}
