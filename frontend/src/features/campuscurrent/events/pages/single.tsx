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
  ExternalLink,
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
import { VerificationBadge } from "@/components/molecules/verification-badge";

// Helper function to format date for display
const formatEventDate = (dateString: string) => {
  const date = new Date(dateString);
  return format(date, "d MMMM");
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
      return "bg-green-100 text-green-900 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
    case "registration":
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

  const eventDate = new Date(event.start_datetime);
  const isPast = eventDate < new Date();
  const communityProfileImg =
    event.community?.media?.find((m) => m.media_format === "profile")?.url ||
    event.community?.media?.[0]?.url;

  // Determine which action buttons to show
  const actionButtons = [];

  if (!isPast) {
    actionButtons.push(
      <Button
        key="calendar"
        className="flex items-center gap-2 flex-1 sm:flex-none"
        onClick={handleAddToCalendar}
      >
        <CalendarPlus className="h-4 w-4" />
        <span>Add to Calendar</span>
      </Button>
    );
  }

  if (!isPast && event.policy === "registration" && event.registration_link) {
    actionButtons.push(
      <a
        key="register"
        href={event.registration_link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 sm:flex-none"
      >
        <Button className="flex items-center gap-2 w-full">
          <ExternalLink className="h-4 w-4" />
          <span>Register</span>
        </Button>
      </a>
    );
  }

  if (event.permissions?.can_edit === true) {
    actionButtons.push(
      <Button
        key="edit"
        variant="outline"
        className="flex items-center gap-2 flex-1 sm:flex-none"
        onClick={() => setShowEditModal(true)}
      >
        <Pencil className="h-4 w-4" />
        <span>Edit Event</span>
      </Button>
    );
  }

  return (
    <div className="container mx-auto pb-20 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Event Image - Left Column on Large Screens */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative h-80 sm:h-96 lg:h-[600px] w-full rounded-xl overflow-hidden bg-muted shadow-sm">
            {event.media && event.media.length > 0 && !imageError ? (
              <>
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-pulse flex items-center justify-center w-full h-full bg-muted">
                      <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
                    </div>
                  </div>
                )}
                <img
                  src={event.media[0].url || "/placeholder.svg"}
                  alt={event.name}
                  className={`w-full h-full object-cover sm:object-contain object-center transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    setImageError(true);
                    setImageLoaded(false);
                  }}
                  loading="lazy"
                />
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <div className="text-center">
                  <Calendar className="h-16 w-16 text-muted-foreground opacity-50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No poster available
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Event Details - Right Column on Large Screens */}
        <div className="space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="font-medium">
              {event.type[0].toUpperCase()}
              {event.type.slice(1)}
            </Badge>
            <Badge variant="outline" className={getPolicyColor(event.policy)}>
              {getPolicyDisplay(event.policy)}
            </Badge>
            <CountdownBadge
              eventDateIso={event.start_datetime}
              durationMinutes={Math.round((new Date(event.end_datetime).getTime() - new Date(event.start_datetime).getTime()) / (1000 * 60))}
            />
          </div>

          {/* Title and Organizer */}
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight break-words">
              {event.name}
            </h1>
            {event.scope === "community" ? (
              <div className="text-primary text-lg font-medium break-words">
                <button
                  type="button"
                  className="hover:underline inline-flex items-center gap-1"
                  onClick={() =>
                    navigate(
                      ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                        event.community?.id.toString() ?? ""
                      )
                    )
                  }
                >
                  <span>by {event.community?.name || "Unknown Community"}</span>
                  <VerificationBadge className="ml-1" size={14} />
                </button>
              </div>
            ) : (
              <div className="text-muted-foreground text-lg break-words">
                by {event.creator?.name} {event.creator?.surname}
              </div>
            )}
          </div>

          {/* Event Info */}
          <div className="space-y-3 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 flex-shrink-0" />
              <span className="text-base">
                {formatEventDate(event.start_datetime)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 flex-shrink-0" />
              <span className="text-base">
                {(() => {
                  const startTime = new Date(event.start_datetime);
                  const endTime = new Date(event.end_datetime);
                  const durationMs = endTime.getTime() - startTime.getTime();
                  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                  const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                  
                  if (durationHours > 0) {
                    return `${durationHours}h ${durationMinutes > 0 ? `${durationMinutes}m` : ''}`;
                  } else {
                    return `${durationMinutes}m`;
                  }
                })()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="text-base">{event.place}</span>
            </div>
            {event.community && (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 flex-shrink-0" />
                <span className="text-base inline-flex items-center gap-1">
                  Organized by {event.community.name}
                  {event.community.verified && (
                    <VerificationBadge className="ml-1" size={12} />
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">About this event</h2>
            <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line break-words">
              {event.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {/* Primary action buttons row */}
            {actionButtons.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                {actionButtons}
              </div>
            )}

            {/* Share button row */}
            <div className="flex">
              <Button
                variant="outline"
                className="flex items-center gap-2 w-full sm:w-auto"
                onClick={shareEvent}
              >
                <Share2 className="h-4 w-4" />
                <span>Share Event</span>
              </Button>
            </div>
          </div>

          {/* Event Organizers */}
          {((event.scope === "community" && event.community) ||
            (event.scope === "personal" && event.creator)) && (
            <div className="mt-8">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Event Organizers</h3>
                <div className="space-y-4">
                  {event.scope === "community" ? (
                    <div
                      className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                      onClick={() =>
                        navigate(
                          ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                            event.community?.id.toString() ?? ""
                          )
                        )
                      }
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {communityProfileImg ? (
                          <img
                            src={communityProfileImg}
                            alt={`${event.community?.name} profile`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base break-words inline-flex items-center gap-1">
                          <span className="truncate">{event.community?.name}</span>
                          {event.community?.verified && (
                            <VerificationBadge className="ml-1" size={12} />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground break-words">
                          Community
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        <img
                          src={event.creator?.picture}
                          alt={`${event.creator?.name}'s profile`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base break-words">
                          {`${event.creator?.name} ${event.creator?.surname}`}
                        </p>
                        <p className="text-sm text-muted-foreground break-words">
                          Event Organizer
                        </p>
                      </div>
                    </div>
                  )}

                  {event.scope === "community" && event.creator && (
                    <div className="flex items-center gap-4 p-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                        {event.creator?.picture ? (
                          <img
                            src={event.creator.picture}
                            alt={`${event.creator?.name} ${event.creator?.surname}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base break-words">
                          {`${event.creator?.name ?? ""} ${
                            event.creator?.surname ?? ""
                          }`.trim() || "Event Coordinator"}
                        </p>
                        <p className="text-sm text-muted-foreground break-words">
                          Event Coordinator
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
