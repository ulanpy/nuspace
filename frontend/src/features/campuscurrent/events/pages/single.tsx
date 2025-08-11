"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CalendarPlus,
  Share2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { ROUTES } from "@/data/routes";
import { useEvent } from "@/features/campuscurrent/events/hooks/useEvent";

import { addToGoogleCalendar as addToGoogleCalendarUtil } from "@/features/campuscurrent/events/utils/calendar";
import { EventModal } from "@/features/campuscurrent/events/components/EventModal";
import { LoginModal } from "@/components/molecules/login-modal";
import { CountdownBadge } from "@/features/campuscurrent/events/components/CountdownBadge";

// Helper function to format date for display
const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMMM, HH:mm");
};

// Helper function to get policy display text
const getPolicyDisplay = (policy: string) => {
  switch (policy) {
    case "open":
      return "Open Entry";
    case "registration":
      return "Registration";
    default:
      return policy;
  }
};

// Helper function to get policy badge color with dark-mode contrast
const getPolicyColor = (policy: string) => {
  switch (policy) {
    case "open":
      // green pill with proper dark mode contrast
      return "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
    case "registration":
      // blue pill with proper dark mode contrast
      return "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
  }
};

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const { event, isLoading, isError } = useEvent();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddToCalendar = () => {
    if (!event) return;
    if (!user) {
      setPendingAction(() => handleAddToCalendar);
      setShowLoginModal(true);
      return;
    }
    addToGoogleCalendarUtil(event);
    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    });
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      action();
    }
  };

  // Share event
  const shareEvent = () => {
    if (!event) return;

    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: `Check out this event: ${event.name}`,
        url: window.location.href,
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-destructive mb-4">
            {isError ? "Failed to fetch event details" : "Event not found"}
          </h2>
          <Button onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.ROOT)}>
            Return to Events
          </Button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.event_datetime);
  const isPast = eventDate < new Date();
  const isUpcoming = !isPast;
  const communityProfileImg = event.community?.media?.find((m) => m.media_format === "profile")?.url || event.community?.media?.[0]?.url;

  return (
    <div className="pb-20 px-4 max-w-full overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Image */}
        <div className="relative">
          <div className="relative h-80 sm:h-96 md:h-[500px] w-full rounded-lg overflow-hidden bg-muted">
            {event.media && event.media.length > 0 && !imageError ? (
              <>
                {/* Loading skeleton */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse flex items-center justify-center w-full h-full bg-muted">
                      <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                )}
                
                {/* Actual image */}
                <img
                  src={event.media[0].url || "/placeholder.svg"}
                  alt={event.name}
                  className={`
                    w-full h-full object-contain object-center transition-opacity duration-300
                    ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                  `}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                  loading="lazy"
                />
              </>
            ) : (
              // Fallback when no image or image failed to load
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground opacity-50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No poster available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge variant="outline" className="">
              {event.type[0].toUpperCase()}{event.type.slice(1)}
            </Badge>
            <Badge variant="outline" className={`${getPolicyColor(event.policy)}`}>
              {getPolicyDisplay(event.policy)}
            </Badge>
            <CountdownBadge eventDateIso={event.event_datetime} durationMinutes={event.duration} />
          </div>

          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold break-words">{event.name}</h1>
              {event.scope === "community" ? (
                <div
                  className="text-primary hover:underline cursor-pointer mt-1 break-words"
                  onClick={() =>
                    navigate(
                      ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                        event.community?.id.toString() ?? ""
                      )
                    )
                  }
                >
                  by {event.community?.name || "Unknown Community"}
                </div>
              ) : (
                <div className="text-muted-foreground mt-1 break-words">
                  by {event.creator?.name} {event.creator?.surname}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">
                {formatEventDate(event.event_datetime)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">{event.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="break-words">{event.place}</span>
            </div>
            {event.community && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">
                  Organized by {event.community.name}
                </span>
              </div>
            )}
          </div>

          <div className="h-px w-full bg-border my-4" />

          <div className="flex flex-wrap gap-2 mt-6">
            {!isPast && (
              <Button
                className="flex items-center gap-1"
                onClick={handleAddToCalendar}
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Add to Calendar</span>
              </Button>
            )}
            {event.permissions?.can_edit === true && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowEditModal(true)}
              >
                <Pencil className="h-4 w-4" />
                Edit Event
              </Button>
            )}
            <Button
              variant="outline"
              className="flex items-center gap-1"
              onClick={shareEvent}
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <h2 className="font-medium mb-2">About this event</h2>
        <p className="text-muted-foreground whitespace-pre-line break-words">
          {event.description}
        </p>
      </div>

      {/* Organizer details */}
      {(event.scope === "community" && event.community) ||
      (event.scope === "personal" && event.creator) ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {event.scope === "community" && (
              <Button
                onClick={() =>
                  navigate(
                    ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                      event.community?.id.toString() ?? ""
                    )
                  )
                }
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                <span>View Community</span>
              </Button>
            )}
          </div>

          {/* Organizer information */}
          <div className="rounded-lg border p-4">
            <h3 className="font-medium mb-3">Event Organizers</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {event.scope === "community" ? (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {communityProfileImg ? (
                      <img
                        src={communityProfileImg}
                        alt={`${event.community?.name} profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    <img
                      src={event.creator?.picture}
                      alt={`${event.creator?.name}'s profile`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">
                    {event.scope === "community"
                      ? event.community?.name
                      : `${event.creator?.name} ${event.creator?.surname}`}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">
                    {event.scope === "community"
                      ? "Community"
                      : "Event Organizer"}
                  </p>
                </div>
              </div>
              {event.scope === "community" && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {event.creator?.picture ? (
                      <img
                        src={event.creator.picture}
                        alt={`${event.creator?.name} ${event.creator?.surname}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium break-words">{`${event.creator?.name ?? ''} ${event.creator?.surname ?? ''}`.trim() || 'Event Coordinator'}</p>
                    <p className="text-sm text-muted-foreground break-words">Event Coordinator</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <EventModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        communityId={event.community?.id}
        permissions={event.permissions}
        event={event}
        isEditMode={true}
      />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        title="Login Required"
        message="You need to be logged in to add this event to your calendar."
      />
    </div>
  );
}