"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
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
import { ROUTES } from "@/data/routes";
import { useEvent } from "@/features/campuscurrent/hooks/events/useEvent";

import { addToGoogleCalendar as addToGoogleCalendarUtil } from "@/features/campuscurrent/utils/calendar";
import { EventModal } from "@/features/campuscurrent/components/EventModal";

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
    case "free_ticket":
      return "Free Ticket";
    case "paid_ticket":
      return "Paid Ticket";
    default:
      return policy;
  }
};

// Helper function to get policy badge color
const getPolicyColor = (policy: string) => {
  switch (policy) {
    case "open":
      return "bg-green-500";
    case "free_ticket":
      return "bg-blue-500";
    case "paid_ticket":
      return "bg-amber-500";
    default:
      return "bg-gray-500";
  }
};

export default function EventDetailPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { event, isLoading, isError } = useEvent();

  const [showEditModal, setShowEditModal] = useState(false);

  const handleAddToCalendar = () => {
    if (!event) return;



    addToGoogleCalendarUtil(event);

    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    });
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
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-1"
          onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.ROOT)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back to Events</span>
        </Button>

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

  return (
    <div className="pb-20">
      <Button
        variant="ghost"
        className="mb-4 flex items-center gap-1"
        onClick={() => navigate(ROUTES.APPS.CAMPUS_CURRENT.ROOT)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Image */}
        <div className="relative">
          <div className="aspect-video md:aspect-square rounded-lg overflow-hidden">
            {event.media && event.media.length > 0 ? (
              <img
                src={event.media[0].url || "/placeholder.svg"}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Calendar className="h-16 w-16 text-muted-foreground opacity-50" />
              </div>
            )}
          </div>

          
        </div>

        {/* Event Details */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge className={`${getPolicyColor(event.policy)} text-white`}>
              {getPolicyDisplay(event.policy)}
            </Badge>
            <Badge className="bg-gray-500 text-white">{event.type}</Badge>
            <Badge className="bg-blue-500 text-white">{event.tag}</Badge>
            <Badge className="bg-yellow-500 text-white">{event.status}</Badge>
            {isPast && (
              <Badge
                variant="outline"
                className="text-destructive border-destructive"
              >
                Event Ended
              </Badge>
            )}
          </div>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              {event.scope === "community" ? (
                <div
                  className="text-primary hover:underline cursor-pointer mt-1"
                  onClick={() =>
                    navigate(
                      ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                        event.community?.id.toString() ?? "",
                      ),
                    )
                  }
                >
                  by {event.community?.name || 'Unknown Community'}
                </div>
              ) : (
                <div className="text-muted-foreground mt-1">
                  by {event.creator?.name} {event.creator?.surname}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(event.event_datetime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{event.duration} minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.place}</span>
            </div>
            {event.community && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Organized by {event.community.name}</span>
              </div>
            )}
          </div>

          <div className="h-px w-full bg-border my-4" />

          <div>
            <h2 className="font-medium mb-2">About this event</h2>
            <p className="text-muted-foreground whitespace-pre-line">
              {event.description}
            </p>
          </div>

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

      {/* Organizer details */}
      {(event.scope === "community" && event.community) ||
      (event.scope === "personal" && event.creator) ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Organized by</h2>
              <p className="text-muted-foreground mt-1">
                {event.scope === "community"
                  ? `This event is hosted by ${event.community?.name}`
                  : `This event is hosted by ${event.creator?.name} ${event.creator?.surname}`}
              </p>
            </div>
            {event.scope === "community" && (
              <Button
                onClick={() =>
                  navigate(
                    ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(
                      event.community?.id.toString() ?? "",
                    ),
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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {event.scope === "community"
                      ? event.community?.name
                      : `${event.creator?.name} ${event.creator?.surname}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {event.scope === "community"
                      ? "Community"
                      : "Event Organizer"}
                  </p>
                </div>
              </div>
              {event.scope === "community" && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Event Coordinator</p>
                    <p className="text-sm text-muted-foreground">
                      Contact via community's social media
                    </p>
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
    </div>
  );
}
