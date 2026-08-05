"use client";

import { ArrowRight, Calendar, Check, MapPin } from "lucide-react";
import Link from "@/router/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
          className="flex gap-3 p-3 sm:gap-4 sm:p-4"
        >
          <AnnouncementEventPoster
            src={event.media?.[0]?.url}
            alt={event.name}
            priority
            fit="cover"
            className="w-20 sm:w-28"
          />

          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
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
              {event.is_going ? (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Going
                </Badge>
              ) : null}
            </div>

            <h3 className="text-sm font-semibold leading-snug line-clamp-2 sm:text-base">
              {event.name}
            </h3>

            <div className="space-y-0.5 text-xs text-muted-foreground sm:text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {formatEventDate(event.start_datetime)} · {formatEventTime(event.start_datetime)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{event.place}</span>
              </div>
            </div>

            <span className="mt-auto inline-flex w-fit items-center gap-1 pt-0.5 text-xs font-medium text-primary sm:text-sm">
              View event
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
