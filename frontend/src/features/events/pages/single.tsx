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
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { EventModal } from '@/features/events/components/event-modal';
import { CountdownBadge } from '@/features/events/components/countdown-badge';
import { VerificationBadge } from "@/components/molecules/verification-badge";
import { MarkdownContent } from '@/components/molecules/markdown-content';
import { QueryBoundary } from '@/components/molecules/query-boundary';
import type { Event } from "@/features/shared/campus/types";
import {
  useEventDetailViewModel,
  type EventActionDescriptor,
  type EventActionId,
} from '@/features/events/hooks/use-event-detail-view-model';
import {
  formatEventDate,
  formatEventTime,
  getPolicyColor,
  getPolicyDisplay,
} from '@/features/events/utils/event-formatters';

const actionIconMap: Record<EventActionId, LucideIcon> = {
  calendar: CalendarPlus,
  register: ExternalLink,
  edit: Pencil,
};

const renderActionButton = (action: EventActionDescriptor) => {
  const Icon = actionIconMap[action.id];
  const button = (
    <Button
      variant={action.variant ?? "default"}
      className="flex items-center gap-2 w-full"
      onClick={action.onClick}
    >
      <Icon className="h-4 w-4" />
      <span>{action.label}</span>
    </Button>
  );

  if (action.href) {
    return (
      <a
        key={action.id}
        href={action.href}
        target={action.openInNewTab ? "_blank" : undefined}
        rel={action.openInNewTab ? "noopener noreferrer" : undefined}
        className="flex-1 sm:flex-none"
      >
        {button}
      </a>
    );
  }

  return (
    <div key={action.id} className="flex-1 sm:flex-none">
      {button}
    </div>
  );
};

export default function EventDetailPage() {
  const {
    event,
    isLoading,
    isError,
    shareEvent,
    goToEventsRoot,
    goToCommunity,
    actionDescriptors,
    durationMinutes,
    communityProfileImg,
    showEditModal,
    closeEditModal,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
  } = useEventDetailViewModel();

  return (
    <QueryBoundary
      data={event}
      isLoading={isLoading}
      isError={isError}
      loadingFallback={<EventDetailLoading />}
      errorFallback={
        <EventDetailErrorState isError={isError} onBack={goToEventsRoot} />
      }
    >
      {(resolvedEvent) => (
        <EventDetailView
          event={resolvedEvent}
          shareEvent={shareEvent}
          goToCommunity={goToCommunity}
          actionDescriptors={actionDescriptors}
          durationMinutes={durationMinutes}
          communityProfileImg={communityProfileImg}
          showEditModal={showEditModal}
          closeEditModal={closeEditModal}
          imageLoaded={imageLoaded}
          imageError={imageError}
          handleImageLoad={handleImageLoad}
          handleImageError={handleImageError}
        />
      )}
    </QueryBoundary>
  );
}

type EventDetailViewProps = {
  event: Event;
  shareEvent: () => void;
  goToCommunity: () => void;
  actionDescriptors: EventActionDescriptor[];
  durationMinutes: number;
  communityProfileImg: string | null;
  showEditModal: boolean;
  closeEditModal: () => void;
  imageLoaded: boolean;
  imageError: boolean;
  handleImageLoad: () => void;
  handleImageError: () => void;
};

const EventDetailView = ({
  event,
  shareEvent,
  goToCommunity,
  actionDescriptors,
  durationMinutes,
  communityProfileImg,
  showEditModal,
  closeEditModal,
  imageLoaded,
  imageError,
  handleImageLoad,
  handleImageError,
}: EventDetailViewProps) => {
  return (
    <div className="container mx-auto pb-20 px-4 max-w-7xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-muted shadow-sm lg:max-h-[600px]">
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
                  className={`w-full h-full object-contain object-center transition-opacity duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={handleImageLoad}
                  onError={handleImageError}
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

        <div className="space-y-6">
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
              durationMinutes={durationMinutes}
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold leading-tight break-words">
              {event.name}
            </h1>
            {event.scope === "community" ? (
              <div className="text-primary text-lg font-medium break-words">
                <button
                  type="button"
                  className="hover:underline inline-flex items-center gap-1"
                  onClick={goToCommunity}
                >
                  <span>by {event.community?.name || "Unknown Community"}</span>
                  {event.community?.verified && <VerificationBadge className="ml-1" size={14} />}
                </button>
              </div>
            ) : (
              <div className="text-muted-foreground text-lg break-words">
                by {event.creator?.name} {event.creator?.surname}
              </div>
            )}
          </div>

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
                {formatEventTime(event.start_datetime)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              <span className="text-base">{event.place}</span>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">About this event</h2>
            <MarkdownContent content={event.description} />
          </div>

          <div className="space-y-3 pt-4">
            {actionDescriptors.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                {actionDescriptors.map((action) => renderActionButton(action))}
              </div>
            )}

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

          {((event.scope === "community" && event.community) ||
            (event.scope === "personal" && event.creator)) && (
            <div className="mt-8">
              <div className="rounded-xl border bg-card p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Event Organizers</h3>
                <div className="space-y-4">
                  {event.scope === "community" ? (
                    <div
                      className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                      onClick={goToCommunity}
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
                          <span className="truncate">
                            {event.community?.name}
                          </span>
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

      <EventModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        communityId={event.community?.id}
        permissions={event.permissions}
        event={event}
        isEditMode={true}
      />
    </div>
  );
};

const EventDetailLoading = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

const EventDetailErrorState = ({
  isError,
  onBack,
}: {
  isError?: boolean;
  onBack: () => void;
}) => (
  <div className="container mx-auto px-4 py-6">
    <div className="text-center py-12">
      <h2 className="text-xl font-bold text-destructive mb-4">
        {isError ? "Failed to fetch event details" : "Event not found"}
      </h2>
      <Button onClick={onBack}>Return to Events</Button>
    </div>
  </div>
);

