import { Link } from "@tanstack/react-router"
import { ArrowRightIcon, CalendarIcon, MapPinIcon } from "lucide-react"

import { eventPolicyLabel, getEventTiming } from "@/lib/events"
import { selectMedia } from "@/lib/media"
import { formatCampusDateTime } from "@/lib/utils"
import { useMinuteNow } from "@/hooks/use-minute-now"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { Event } from "@/lib/events"

export function AnnouncementFeaturedEvent({ event }: { event: Event }) {
  const now = useMinuteNow()
  const timing = getEventTiming(
    event.start_datetime,
    event.end_datetime,
    now,
    event.type
  )
  const poster = selectMedia(event.media, "carousel")

  return (
    <Card className="overflow-hidden p-0">
      <Link
        to="/events/$eventId"
        params={{ eventId: String(event.id) }}
        className="flex gap-3 p-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ResilientImage
          src={poster?.url}
          alt={`Poster for ${event.name}`}
          containerClassName="aspect-[3/4] w-28 shrink-0 rounded-lg"
          fallback={
            <span className="grid size-full place-items-center text-muted-foreground">
              <CalendarIcon className="size-8" aria-hidden />
            </span>
          }
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
          <div className="flex flex-wrap gap-1.5">
            {timing.kind === "ongoing" && <Badge>Ongoing</Badge>}
            <Badge variant="outline">{eventPolicyLabel(event.policy)}</Badge>
          </div>
          <h3 className="text-lg font-semibold text-balance">{event.name}</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" aria-hidden />
              {event.type === "recruitment" ? "Deadline: " : ""}
              {formatCampusDateTime(
                event.type === "recruitment"
                  ? event.end_datetime
                  : event.start_datetime
              )}
            </p>
            <p className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{event.place}</span>
            </p>
          </div>
          <span className="mt-auto inline-flex items-center gap-2 font-medium text-primary">
            View event
            <ArrowRightIcon className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
    </Card>
  )
}
