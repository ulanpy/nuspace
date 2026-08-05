"use client";

import Link from "@/router/link";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementEventPoster } from "@/features/announcements/components/announcement-event-poster";
import { formatEventDate } from "@/features/events/utils/event-formatters";
import { ROUTES } from "@/data/routes";
import { cn } from "@/lib/utils";
import type { Event } from "@/features/shared/campus/types";

type EventPosterStripProps = {
  events: Event[];
};

const hideScrollbar =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function EventPosterStripSkeleton() {
  return (
    <div className={cn("flex gap-3 overflow-x-auto", hideScrollbar)}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="w-32 flex-shrink-0 space-y-2 sm:w-36">
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function EventPosterStrip({ events }: EventPosterStripProps) {
  if (events.length === 0) return null;

  return (
    <div className={cn("-mx-1 flex gap-3 overflow-x-auto px-1 pb-1", hideScrollbar)}>
      {events.map((event, index) => (
        <Link
          key={event.id}
          href={ROUTES.EVENTS.DETAIL_FN(event.id)}
          className="group w-32 shrink-0 space-y-2 transition-opacity hover:opacity-90 sm:w-36"
        >
          <AnnouncementEventPoster
            src={event.media?.[0]?.url}
            alt={event.name}
            priority={index < 3}
            fit="cover"
            className="w-full shadow-sm transition-shadow group-hover:shadow-md"
          />
          <div className="space-y-0.5 px-0.5">
            <p className="text-sm font-medium leading-snug line-clamp-2">{event.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatEventDate(event.start_datetime)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
