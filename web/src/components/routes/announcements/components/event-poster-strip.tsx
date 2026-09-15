import { Link } from "@tanstack/react-router"
import { CalendarIcon } from "lucide-react"

import { selectMedia } from "@/lib/media"
import { formatCampusDateTime } from "@/lib/utils"
import { ResilientImage } from "@/components/shared/media/resilient-image"
import type { Event } from "@/lib/events"

export function EventPosterStrip({ events }: { events: Event[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {events.map((event) => {
        const poster = selectMedia(event.media, "carousel")

        return (
          <Link
            key={event.id}
            to="/events/$eventId"
            params={{ eventId: String(event.id) }}
            className="group w-37 shrink-0 space-y-1.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ResilientImage
              src={poster?.url}
              alt={`Poster for ${event.name}`}
              containerClassName="aspect-[3/4] w-full rounded-lg"
              fallback={
                <span className="grid size-full place-items-center bg-muted text-muted-foreground">
                  <CalendarIcon className="size-8" aria-hidden />
                </span>
              }
            />
            <p className="line-clamp-2 font-medium leading-snug group-hover:text-primary">
              {event.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {event.type === "recruitment" ? "Deadline: " : ""}
              {formatCampusDateTime(
                event.type === "recruitment"
                  ? event.end_datetime
                  : event.start_datetime
              )}
            </p>
          </Link>
        )
      })}
    </div>
  )
}
