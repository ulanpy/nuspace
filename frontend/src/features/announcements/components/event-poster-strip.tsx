"use client";

import Link from "@/router/link";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementEventPoster } from "@/features/announcements/components/announcement-event-poster";
import { formatEventDate } from "@/features/events/utils/event-formatters";
import { ROUTES } from "@/data/routes";
import type { Event } from "@/features/shared/campus/types";

type EventPosterStripProps = {
  events: Event[];
};

export function EventPosterStripSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="w-28 flex-shrink-0 space-y-2">
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
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex w-max gap-3 pb-3">
        {events.map((event, index) => (
          <Link
            key={event.id}
            href={ROUTES.EVENTS.DETAIL_FN(event.id)}
            className="group w-28 shrink-0 space-y-2 whitespace-normal transition-opacity hover:opacity-90"
          >
            <AnnouncementEventPoster
              src={event.media?.[0]?.url}
              alt={event.name}
              priority={index < 3}
              className="w-full shadow-sm ring-1 ring-border/60 transition-shadow group-hover:shadow-md"
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
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
