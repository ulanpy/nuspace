"use client";

import { useState } from "react";
import Link from "@/router/link";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeInImage } from "@/components/shared/fade-in-image";
import { Skeleton } from "@/components/ui/skeleton";
import { Event } from "@/features/shared/campus/types";
import { CountdownHeaderBar } from './countdown-header-bar';
import { ROUTES } from "@/data/routes";
import { getPolicyColor, getPolicyDisplay } from "@/features/events/utils/event-formatters";
import { formatInCampusTime, isoToCampusWallClock } from "@/features/events/utils/campus-datetime";

interface EventCardProps extends Event {
  compact?: boolean;
  /** First row / LCP posters should load eagerly */
  priorityImage?: boolean;
}

export function EventCardSkeleton() {
  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <Skeleton className="h-8 w-full rounded-none rounded-t-lg" />
      <Skeleton className="aspect-[3/4] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </Card>
  );
}

export function EventCard(props: EventCardProps) {
  const { 
    id,
    name, 
    start_datetime, 
    end_datetime,
    policy, 
    media,
    priorityImage = false,
 } = props;

  const [imageError, setImageError] = useState(false);

  const formatEventDate = (dateString: string) => {
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
  };

  const isUpcoming = new Date(start_datetime).getTime() > Date.now();

  // Calculate duration in minutes for the countdown component
  const durationMinutes = Math.round((new Date(end_datetime).getTime() - new Date(start_datetime).getTime()) / (1000 * 60));

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CountdownHeaderBar eventDateIso={start_datetime} durationMinutes={durationMinutes} />
      <Link href={ROUTES.EVENTS.DETAIL_FN(String(id))}>
        <div className="aspect-[3/4] relative overflow-hidden bg-muted">
          {media && media.length > 0 && media[0]?.url && !imageError ? (
            <FadeInImage
              src={media[0].url}
              alt={name}
              fill
              priority={priorityImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No poster available</p>
              </div>
            </div>
          )}
          
          {/* Policy badge overlay - bottom left */}
          <div className="absolute bottom-2 left-2 z-10">
            <Badge
              variant="outline"
              className={`text-xs backdrop-blur-sm ${getPolicyColor(policy)}`}
            >
              {getPolicyDisplay(policy)}
            </Badge>
          </div>
          
          {/* Profile image overlay - bottom right */}
          <div className="absolute bottom-2 right-2 z-10">
            {props.creator?.picture && (
              <FadeInImage
                src={props.creator.picture}
                alt={`${props.creator.name} ${props.creator.surname}`}
                className="h-8 w-8 rounded-full border-2 border-white shadow-md object-cover"
              />
            )}
          </div>
        </div>
      </Link>
      <CardHeader className="p-3 pb-2 flex-shrink-0">
        <div className="space-y-1">
          <Link
            href={ROUTES.EVENTS.DETAIL_FN(String(id))}
            className="hover:underline"
          >
            <h3 className="text-base font-semibold line-clamp-2 leading-tight">{name}</h3>
          </Link>
          <div className="text-sm text-muted-foreground line-clamp-1">
            {props.creator
              ? `by ${props.creator.name} ${props.creator.surname}`
              : "by Unknown Organizer"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 mt-auto">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {formatEventDate(start_datetime)}
            </span>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}