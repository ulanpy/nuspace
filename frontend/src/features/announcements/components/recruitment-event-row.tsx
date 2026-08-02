"use client";

import { ArrowRight } from "lucide-react";
import Link from "@/router/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnnouncementEventPoster } from "@/features/announcements/components/announcement-event-poster";
import { formatEventDate } from "@/features/events/utils/event-formatters";
import { ROUTES } from "@/data/routes";
import type { Event } from "@/features/shared/campus/types";

type RecruitmentEventRowProps = {
  event: Event;
};

export function RecruitmentEventRowSkeleton() {
  return (
    <Card className="flex items-center gap-3 p-3">
      <Skeleton className="aspect-[3/4] w-14 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </Card>
  );
}

export function RecruitmentEventRow({ event }: RecruitmentEventRowProps) {
  return (
    <Card className="transition-colors hover:bg-muted/50">
      <Link
        href={ROUTES.EVENTS.DETAIL_FN(event.id)}
        className="flex items-center gap-3 p-3"
      >
        <AnnouncementEventPoster
          src={event.media?.[0]?.url}
          alt={event.name}
          fallback="users"
          className="w-14"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="font-medium leading-snug line-clamp-2">{event.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{event.place}</p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-xs text-muted-foreground">
              {formatEventDate(event.start_datetime)}
            </span>
            <Badge variant="secondary" className="text-xs">
              Recruitment
            </Badge>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      </Link>
    </Card>
  );
}
