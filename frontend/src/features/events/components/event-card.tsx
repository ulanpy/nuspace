"use client";

import { useState } from "react";
import Link from "@/router/link";
import { Calendar, Check, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeInImage } from "@/components/shared/fade-in-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Event } from "@/features/shared/campus/types";
import { CountdownHeaderBar } from "./countdown-header-bar";
import { ROUTES } from "@/data/routes";
import { getPolicyColor, getPolicyDisplay } from "@/features/events/utils/event-formatters";
import { formatInCampusTime, isoToCampusWallClock } from "@/features/events/utils/campus-datetime";

interface EventCardProps extends Event {
  /** First row / LCP posters should load eagerly */
  priorityImage?: boolean;
}

export function EventCardSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <Skeleton className="h-7 w-full rounded-none rounded-t-lg" />
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

function formatEventDate(dateString: string) {
  const { date: eventLocalDate } = isoToCampusWallClock(dateString);
  const { date: today } = isoToCampusWallClock(new Date().toISOString());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const timeLabel = formatInCampusTime(dateString, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (eventLocalDate.getTime() === today.getTime()) {
    return `Today at ${timeLabel}`;
  }
  if (eventLocalDate.getTime() === tomorrow.getTime()) {
    return `Tomorrow at ${timeLabel}`;
  }

  const day = eventLocalDate.getDate();
  const month = formatInCampusTime(dateString, { month: "short" });
  const year = eventLocalDate.getFullYear();
  const currentYear = today.getFullYear();

  if (year === currentYear) {
    return `${day} ${month} at ${timeLabel}`;
  }
  return `${day} ${month} ${year} at ${timeLabel}`;
}

export function EventCard(props: EventCardProps) {
  const {
    id,
    name,
    start_datetime,
    end_datetime,
    place,
    policy,
    media,
    is_going,
    priorityImage = false,
  } = props;

  const [imageError, setImageError] = useState(false);

  const durationMinutes = Math.round(
    (new Date(end_datetime).getTime() - new Date(start_datetime).getTime()) / (1000 * 60),
  );

  return (
    <Card className="group h-full overflow-hidden transition-shadow hover:shadow-md">
      <Link
        href={ROUTES.EVENTS.DETAIL_FN(String(id))}
        className="flex h-full flex-col"
      >
        <CountdownHeaderBar
          eventDateIso={start_datetime}
          durationMinutes={durationMinutes}
        />

        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {media?.[0]?.url && !imageError ? (
            <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.02]">
              <FadeInImage
                src={media[0].url}
                alt={name}
                fill
                priority={priorityImage}
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <Calendar className="mx-auto mb-1 h-10 w-10 text-muted-foreground opacity-50" />
                <p className="text-xs text-muted-foreground">No poster</p>
              </div>
            </div>
          )}

          <div className="absolute bottom-2 left-2 z-10 flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={`text-xs backdrop-blur-sm ${getPolicyColor(policy)}`}
            >
              {getPolicyDisplay(policy)}
            </Badge>
            {is_going ? (
              <Badge
                variant="default"
                className="gap-1 text-xs shadow-sm"
              >
                <Check className="h-3 w-3" />
                Going
              </Badge>
            ) : null}
          </div>
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 p-3">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 sm:text-base group-hover:underline">
            {name}
          </h3>

          <div className="mt-auto space-y-1 text-xs text-muted-foreground sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{formatEventDate(start_datetime)}</span>
            </div>
            {place ? (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{place}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
