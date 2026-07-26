import { Link } from "@tanstack/react-router"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import type { Event } from "@/features/events/types"
import { selectMedia } from "@/features/media/select"
import { formatCampusDateTime, isPast } from "@/lib/datetime"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

export function EventCard({ event }: { event: Event }) {
  // Posters are portrait by convention — the upload guidance asks for 3:4 —
  // so the card reserves that shape rather than cropping to a wide strip.
  const poster = selectMedia(event.media, "carousel")
  const finished = isPast(event.end_datetime)

  return (
    <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
      <Link
        to="/events/$eventId"
        params={{ eventId: String(event.id) }}
        className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {poster && (
          <img
            src={poster.url}
            alt=""
            aria-hidden
            loading="lazy"
            className="aspect-[3/4] w-full bg-muted object-cover"
          />
        )}

        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{event.type}</Badge>
            {finished && <Badge variant="outline">Finished</Badge>}
          </div>

          <h3 className="leading-snug font-semibold text-balance">
            {event.name}
          </h3>

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
          </dl>
        </div>
      </Link>
    </Card>
  )
}
