"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/atoms/card";
import { Badge } from "@/components/atoms/badge";
import { Event } from "@/features/shared/campus/types";
import profilePlaceholder from "@/assets/svg/profile-placeholder.svg";
import { getSvgSrc } from "@/utils/svg-utils";
import { CountdownHeaderBar } from './countdown-header-bar';
import { ROUTES } from "@/data/routes";

interface EventCardProps extends Event {
  compact?: boolean;
}

export function EventCard(props: EventCardProps) {
  const { 
    id,
    name, 
    start_datetime, 
    end_datetime,
    policy, 
    media,
    type,
 } = props;
  const compact = props.compact === true;

  const [imageError, setImageError] = useState(false);

  // Helper function to format event date in a human-readable way
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    // Format time
    const time = date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Check if it's today, tomorrow, or another date
    if (eventDate.getTime() === today.getTime()) {
      return `Today at ${time}`;
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow at ${time}`;
    } else {
      // For other dates, show "11 Aug at 2:30 PM" format
      const day = date.getDate();
      const month = date.toLocaleDateString([], { month: 'short' });
      const year = date.getFullYear();
      const currentYear = now.getFullYear();
      
      if (year === currentYear) {
        return `${day} ${month} at ${time}`;
      } else {
        return `${day} ${month} ${year} at ${time}`;
      }
    }
  };

  // Helper function to get policy display text
  const getPolicyDisplay = (policy: string) => {
    switch (policy) {
      case "open":
        return "Open";
      case "registration":
        return "Registration";
      default:
        return policy;
    }
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
            <img
              src={media[0].url}
              alt={name}
              className="object-cover w-full h-full"
              onError={() => setImageError(true)}
              loading="lazy"
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
          <div className="absolute bottom-2 left-2">
            <Badge
              variant="outline"
              className={`text-xs bg-white/90 backdrop-blur-sm ${
                policy === 'open'
                  ? 'bg-green-100/90 text-green-900 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-800'
                  : 'bg-blue-100/90 text-blue-900 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800'
              }`}
            >
              {getPolicyDisplay(policy)}
            </Badge>
          </div>
          
          {/* Profile image overlay - bottom right */}
          <div className="absolute bottom-2 right-2">
            {props.scope === "personal" && props.creator?.picture && (
              <img
                src={props.creator.picture}
                alt={`${props.creator.name} ${props.creator.surname}`}
                className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
              />
            )}
            {props.scope === "community" && props.community?.media && (
              (() => {
                const profileMedia = props.community.media.find(
                  (media) => 
                    media.entity_type === "communities" && 
                    media.media_format === "profile"
                );
                return profileMedia ? (
                  <img
                    src={profileMedia.url}
                    alt={props.community.name}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                  />
                ) : (
                  <img
                    src={profilePlaceholder}
                    alt={props.community.name || "Community Profile"}
                    className="w-8 h-8 rounded-full border-2 border-white shadow-md object-cover"
                  />
                );
              })()
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
            {props.scope === "community" 
              ? `by ${props.community?.name || 'Unknown Community'}` 
              : `by ${props.creator?.name} ${props.creator?.surname}`}
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