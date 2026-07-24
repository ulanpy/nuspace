'use client'

import {
  ArrowLeft,
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
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/atoms/page-container";
import { Badge } from "@/components/ui/badge";
import { EventModal } from '@/features/events/components/event-modal';
import { CountdownBadge } from '@/features/events/components/countdown-badge';
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
      className="flex items-center gap-2"
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
      >
        {button}
      </a>
    );
  }

  return <div key={action.id}>{button}</div>;
};

export default function EventDetailPage() {
  const {
    event,
    isLoading,
    isError,
    shareEvent,
    goToEventsRoot,
    actionDescriptors,
    durationMinutes,
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
          goToEventsRoot={goToEventsRoot}
          actionDescriptors={actionDescriptors}
          durationMinutes={durationMinutes}
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
  goToEventsRoot: () => void;
  actionDescriptors: EventActionDescriptor[];
  durationMinutes: number;
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
  goToEventsRoot,
  actionDescriptors,
  durationMinutes,
  showEditModal,
  closeEditModal,
  imageLoaded,
  imageError,
  handleImageLoad,
  handleImageError,
}: EventDetailViewProps) => {
  return (
    <PageContainer maxWidth="full" padding="default" className="pb-20">
      <Button
        variant="ghost"
        className="flex items-center gap-2 -ml-3 mb-4 text-muted-foreground hover:text-foreground"
        onClick={goToEventsRoot}
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </Button>

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
            {event.creator ? (
              <div className="text-muted-foreground text-lg break-words">
                by {event.creator.name} {event.creator.surname}
              </div>
            ) : null}
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

          <div className="flex flex-wrap items-center gap-3 pt-4">
            {actionDescriptors.map((action) => renderActionButton(action))}
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={shareEvent}
              aria-label="Share Event"
              title="Share Event"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {event.creator && (
            <div className="pt-6 mt-2 border-t space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Organizer
              </h3>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {event.creator.picture ? (
                      <img
                        src={event.creator.picture}
                        alt={`${event.creator.name}'s profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm break-words">
                      {`${event.creator.name} ${event.creator.surname}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Event Organizer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <EventModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        permissions={event.permissions}
        event={event}
        isEditMode={true}
      />
    </PageContainer>
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
  <PageContainer padding="default">
    <div className="text-center py-12">
      <h2 className="text-xl font-bold text-destructive mb-4">
        {isError ? "Failed to fetch event details" : "Event not found"}
      </h2>
      <Button onClick={onBack}>Return to Events</Button>
    </div>
  </PageContainer>
  );
