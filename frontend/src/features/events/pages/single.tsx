'use client'

import {
  ArrowLeft,
  Calendar,
  MapPin,
  CalendarPlus,
  Share2,
  Pencil,
  ExternalLink,
  Users,
  Check,
  Download,
  FileSpreadsheet,
  Link2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageContainer } from "@/components/shared/page-container";
import { Badge } from "@/components/ui/badge";
import { AuthWallModal } from "@/components/molecules/auth-wall-modal";
import { EventModal } from '@/features/events/components/event-modal';
import { ShareAccessDialog } from "@/features/events/components/share-access-dialog";
import { CountdownBadge } from '@/features/events/components/countdown-badge';
import { MarkdownContent } from '@/components/molecules/markdown-content';
import { QueryBoundary } from '@/components/molecules/query-boundary';
import type { Event, EventAttendee } from "@/features/shared/campus/types";
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
import { formatInCampusTime } from "@/features/events/utils/campus-datetime";

const actionIconMap: Record<EventActionId, LucideIcon> = {
  calendar: CalendarPlus,
  edit: Pencil,
  share_access: Link2,
};

const renderActionButton = (action: EventActionDescriptor) => {
  const Icon = actionIconMap[action.id];
  return (
    <Button
      key={action.id}
      variant={action.variant ?? "default"}
      className="flex items-center gap-2"
      onClick={action.onClick}
      disabled={action.disabled}
    >
      <Icon className="h-4 w-4" />
      <span>{action.label}</span>
    </Button>
  );
};

export default function EventDetailPage() {
  const {
    event,
    isLoading,
    isError,
    shareEvent,
    goToEventsRoot,
    showOpenGoingCta,
    requiresExternalRegistration,
    isGoing,
    isGoingBusy,
    handleToggleGoing,
    handleRegister,
    secondaryActions,
    durationMinutes,
    showEditModal,
    closeEditModal,
    showShareAccessModal,
    closeShareAccessModal,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
    attendeesCount,
    showAttendeesCount,
    canViewAttendees,
    attendees,
    attendeesTotal,
    isAttendeesLoading,
    isAttendeesError,
    hasMoreAttendees,
    isFetchingMoreAttendees,
    attendeesLoadMoreRef,
    handleExportAttendees,
    isExporting,
    isAuthModalOpen,
    closeAuthModal,
  } = useEventDetailViewModel();

  return (
    <>
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
            showOpenGoingCta={showOpenGoingCta}
            requiresExternalRegistration={requiresExternalRegistration}
            isGoing={isGoing}
            isGoingBusy={isGoingBusy}
            handleToggleGoing={handleToggleGoing}
            handleRegister={handleRegister}
            secondaryActions={secondaryActions}
            durationMinutes={durationMinutes}
            showEditModal={showEditModal}
            closeEditModal={closeEditModal}
            showShareAccessModal={showShareAccessModal}
            closeShareAccessModal={closeShareAccessModal}
            imageLoaded={imageLoaded}
            imageError={imageError}
            handleImageLoad={handleImageLoad}
            handleImageError={handleImageError}
            attendeesCount={attendeesCount}
            showAttendeesCount={showAttendeesCount}
            canViewAttendees={canViewAttendees}
            attendees={attendees}
            attendeesTotal={attendeesTotal}
            isAttendeesLoading={isAttendeesLoading}
            isAttendeesError={isAttendeesError}
            hasMoreAttendees={hasMoreAttendees}
            isFetchingMoreAttendees={isFetchingMoreAttendees}
            attendeesLoadMoreRef={attendeesLoadMoreRef}
            handleExportAttendees={handleExportAttendees}
            isExporting={isExporting}
          />
        )}
      </QueryBoundary>

      <AuthWallModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        message="You need to be logged in to continue."
      />
    </>
  );
}

type EventDetailViewProps = {
  event: Event;
  shareEvent: () => void;
  goToEventsRoot: () => void;
  showOpenGoingCta: boolean;
  requiresExternalRegistration: boolean;
  isGoing: boolean;
  isGoingBusy: boolean;
  handleToggleGoing: () => void;
  handleRegister: () => void;
  secondaryActions: EventActionDescriptor[];
  durationMinutes: number;
  showEditModal: boolean;
  closeEditModal: () => void;
  showShareAccessModal: boolean;
  closeShareAccessModal: () => void;
  imageLoaded: boolean;
  imageError: boolean;
  handleImageLoad: () => void;
  handleImageError: () => void;
  attendeesCount: number;
  showAttendeesCount: boolean;
  canViewAttendees: boolean;
  attendees: EventAttendee[];
  attendeesTotal: number;
  isAttendeesLoading: boolean;
  isAttendeesError: boolean;
  hasMoreAttendees: boolean;
  isFetchingMoreAttendees: boolean;
  attendeesLoadMoreRef: (node: HTMLDivElement | null) => void;
  handleExportAttendees: (format: "csv" | "xlsx") => void;
  isExporting: boolean;
};

const EventDetailView = ({
  event,
  shareEvent,
  goToEventsRoot,
  showOpenGoingCta,
  requiresExternalRegistration,
  isGoing,
  isGoingBusy,
  handleToggleGoing,
  handleRegister,
  secondaryActions,
  durationMinutes,
  showEditModal,
  closeEditModal,
  showShareAccessModal,
  closeShareAccessModal,
  imageLoaded,
  imageError,
  handleImageLoad,
  handleImageError,
  attendeesCount,
  showAttendeesCount,
  canViewAttendees,
  attendees,
  attendeesTotal,
  isAttendeesLoading,
  isAttendeesError,
  hasMoreAttendees,
  isFetchingMoreAttendees,
  attendeesLoadMoreRef,
  handleExportAttendees,
  isExporting,
}: EventDetailViewProps) => {
  return (
    <PageContainer maxWidth="full" padding="default" className="pb-20">
      <Button
        variant="ghost"
        className="flex items-center gap-2 -ml-3 mb-5 text-muted-foreground hover:text-foreground"
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

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
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

            <h1 className="text-3xl lg:text-4xl font-bold leading-tight tracking-tight break-words">
              {event.name}
            </h1>
          </div>

          <div className="space-y-2.5 text-muted-foreground">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="text-base text-foreground/90">
                {formatEventDate(event.start_datetime)}
                <span className="text-muted-foreground"> · </span>
                {formatEventTime(event.start_datetime)}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="text-base text-foreground/90">{event.place}</span>
            </div>
            {showAttendeesCount ? (
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="text-base text-foreground/90">
                  {attendeesCount} {attendeesCount === 1 ? "person going" : "people going"}
                </span>
              </div>
            ) : null}
          </div>

          {showOpenGoingCta ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isGoing ? "You're going" : "Planning to attend?"}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                Helps organizers estimate attendance.
                </p>
              </div>
              <Button
                size="lg"
                variant={isGoing ? "default" : "outline"}
                className={
                  isGoing
                    ? "group flex items-center gap-2 border border-transparent transition-colors hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                    : "flex items-center gap-2"
                }
                disabled={isGoingBusy}
                onClick={handleToggleGoing}
                aria-pressed={isGoing}
                aria-label={isGoing ? "Not going" : "I'm going"}
                title={isGoing ? "Click to cancel" : undefined}
              >
                {isGoing ? (
                  <>
                    <Check className="h-4 w-4 group-hover:hidden" />
                    <span className="group-hover:hidden">Going</span>
                    <span className="hidden group-hover:inline">Not going</span>
                  </>
                ) : (
                  <span>I&apos;m going</span>
                )}
              </Button>
            </div>
          ) : null}

          {requiresExternalRegistration ? (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/25 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">External registration required</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your spot is confirmed only after you submit the external form.
                </p>
              </div>
              <Button
                size="lg"
                className="flex items-center gap-2"
                onClick={handleRegister}
              >
                <ExternalLink className="h-4 w-4" />
                <span>Register</span>
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            {secondaryActions.map((action) => renderActionButton(action))}
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

          <div className="space-y-3 border-t border-border/50 pt-5">
            <h2 className="text-lg font-semibold tracking-tight">About this event</h2>
            <MarkdownContent content={event.description} />
          </div>

          {canViewAttendees && (
            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">Who&apos;s going</h2>
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-medium text-foreground">{attendeesTotal}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isExporting || attendeesTotal === 0}
                    onClick={() => handleExportAttendees("xlsx")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={isExporting || attendeesTotal === 0}
                    onClick={() => handleExportAttendees("csv")}
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                </div>
              </div>

              {isAttendeesLoading ? (
                <p className="text-sm text-muted-foreground">Loading attendees…</p>
              ) : isAttendeesError ? (
                <p className="text-sm text-destructive">Failed to load attendees</p>
              ) : attendees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No one has marked going yet</p>
              ) : (
                <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                  <ul className="space-y-2.5">
                    {attendees.map((attendee) => {
                      const initials =
                        `${attendee.name?.[0] ?? ""}${attendee.surname?.[0] ?? ""}`.toUpperCase() ||
                        "?";
                      const goingAt = formatInCampusTime(attendee.going_at, {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      });
                      return (
                        <li
                          key={attendee.sub}
                          className="flex items-center gap-3 text-sm"
                        >
                          <Avatar size="sm">
                            <AvatarImage src={attendee.picture} alt="" />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-foreground/90">
                              {attendee.name} {attendee.surname}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {attendee.email}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {goingAt}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMoreAttendees ? (
                    <div ref={attendeesLoadMoreRef} className="py-2 text-center">
                      {isFetchingMoreAttendees ? (
                        <p className="text-xs text-muted-foreground">Loading more…</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
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
      <ShareAccessDialog
        eventId={event.id}
        isOpen={showShareAccessModal}
        onClose={closeShareAccessModal}
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
