"use client";

import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import Link from "@/router/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AnnouncementEventPoster } from "@/features/announcements/components/announcement-event-poster";
import {
  formatEventDate,
  formatEventTime,
  getPolicyColor,
  getPolicyDisplay,
} from "@/features/events/utils/event-formatters";
import { ROUTES } from "@/data/routes";
import type { Event } from "@/features/shared/campus/types";

type FeaturedEventCardProps = {
  event: Event;
  isOngoing?: boolean;
};

export function FeaturedEventCard({ event, isOngoing = false }: FeaturedEventCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Link
          href={ROUTES.EVENTS.DETAIL_FN(event.id)}
          className="flex gap-4 p-4 sm:gap-5 sm:p-5"
        >
          <AnnouncementEventPoster
            src={event.media?.[0]?.url}
            alt={event.name}
            priority
            className="w-28 sm:w-36"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {isOngoing ? (
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800"
                  >
                    Ongoing
                  </Badge>
                ) : null}
                <Badge variant="outline" className={getPolicyColor(event.policy)}>
                  {getPolicyDisplay(event.policy)}
                </Badge>
              </div>

              <h3 className="text-lg font-semibold leading-snug sm:text-xl line-clamp-3">
                {event.name}
              </h3>

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{formatEventDate(event.start_datetime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{formatEventTime(event.start_datetime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{event.place}</span>
                </div>
              </div>
            </div>

            <span
              className={cn(
                buttonVariants({ size: "sm" }),
                "pointer-events-none w-fit gap-1.5",
              )}
            >
              View event
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
