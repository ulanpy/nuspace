import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@/router/navigation";
import { ROUTES } from "@/data/routes";
import { toast } from "@/hooks/toast";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { addToGoogleCalendar as addToGoogleCalendarUtil } from "@/features/events/utils/calendar";
import { useEvent } from "./use-event";
import { useEventGoing } from "./use-event-going";
import {
  downloadEventAttendeesExport,
  useEventAttendees,
} from "./use-event-attendees";
import { EventPolicy } from "@/features/shared/campus/types";

export type EventActionId = "calendar" | "edit" | "share_access";

export type EventActionDescriptor = {
  id: EventActionId;
  label: string;
  variant?: "default" | "outline";
  onClick?: () => void;
  disabled?: boolean;
};

export const useEventDetailViewModel = () => {
  const router = useRouter();
  const { event, isLoading, isError } = useEvent();
  const { answerGoing, isToggling } = useEventGoing(event?.id);
  const { requireAuth, isModalOpen, closeModal } = useAuthGate();

  const isExternalRegistrationEvent = Boolean(
    event &&
      event.policy === EventPolicy.registration &&
      event.registration_link,
  );
  const canViewAttendees =
    Boolean(
      event?.permissions?.can_view_attendees ?? event?.permissions?.can_edit,
    ) && !isExternalRegistrationEvent;
  const canShareAccess = Boolean(event?.permissions?.can_share_access);
  const showAttendeesCount = Boolean(event) && !isExternalRegistrationEvent;
  const {
    attendees,
    total: attendeesTotal,
    isLoading: isAttendeesLoading,
    isError: isAttendeesError,
    hasNextPage: hasMoreAttendees,
    isFetchingNextPage: isFetchingMoreAttendees,
    loadMoreRef: attendeesLoadMoreRef,
  } = useEventAttendees(event?.id, canViewAttendees);

  const [isExporting, setIsExporting] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareAccessModal, setShowShareAccessModal] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isPast = useMemo(() => {
    if (!event) return false;
    return new Date(event.end_datetime) < new Date();
  }, [event]);

  const durationMinutes = useMemo(() => {
    if (!event) return 0;
    const start = new Date(event.start_datetime).getTime();
    const end = new Date(event.end_datetime).getTime();
    return Math.max(0, Math.round((end - start) / (1000 * 60)));
  }, [event]);

  const requiresExternalRegistration = Boolean(
    isExternalRegistrationEvent && !isPast,
  );
  const showOpenGoingCta = Boolean(event) && !isPast && !isExternalRegistrationEvent;
  const isGoing = Boolean(event?.is_going);

  const handleAddToCalendar = useCallback(() => {
    if (!event) return;
    addToGoogleCalendarUtil(event);
    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    });
  }, [event]);

  const shareEvent = useCallback(() => {
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
  }, [event]);

  const goToEventsRoot = useCallback(() => {
    router.push(ROUTES.EVENTS.ROOT);
  }, [router]);

  const openEditModal = useCallback(() => setShowEditModal(true), []);
  const closeEditModal = useCallback(() => setShowEditModal(false), []);
  const openShareAccessModal = useCallback(() => setShowShareAccessModal(true), []);
  const closeShareAccessModal = useCallback(
    () => setShowShareAccessModal(false),
    [],
  );

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const handleToggleGoing = useCallback(() => {
    if (!event) return;
    const currentlyGoing = Boolean(event.is_going);
    requireAuth(() => {
      void answerGoing(!currentlyGoing, currentlyGoing);
    });
  }, [answerGoing, event, requireAuth]);

  const handleExportAttendees = useCallback(
    async (format: "csv" | "xlsx") => {
      if (!event) return;
      setIsExporting(true);
      try {
        await downloadEventAttendeesExport(event.id, format);
      } catch {
        toast({
          title: "Error",
          description: "Failed to export attendance list",
          variant: "destructive",
        });
      } finally {
        setIsExporting(false);
      }
    },
    [event],
  );

  const handleRegister = useCallback(() => {
    if (!event?.registration_link) return;
    window.open(event.registration_link, "_blank", "noopener,noreferrer");
  }, [event]);

  const secondaryActions: EventActionDescriptor[] = useMemo(() => {
    if (!event) return [];
    const actions: EventActionDescriptor[] = [];

    if (!isPast && event.type !== "recruitment") {
      actions.push({
        id: "calendar",
        label: "Add to Calendar",
        variant: requiresExternalRegistration || showOpenGoingCta ? "outline" : "default",
        onClick: handleAddToCalendar,
      });
    }

    if (event.permissions?.can_edit) {
      actions.push({
        id: "edit",
        label: "Edit Event",
        variant: "outline",
        onClick: openEditModal,
      });
    }

    if (canShareAccess) {
      actions.push({
        id: "share_access",
        label: "Share access",
        variant: "outline",
        onClick: openShareAccessModal,
      });
    }

    return actions;
  }, [
    canShareAccess,
    event,
    handleAddToCalendar,
    isPast,
    openEditModal,
    openShareAccessModal,
    requiresExternalRegistration,
    showOpenGoingCta,
  ]);

  return {
    event,
    isLoading,
    isError,
    isPast,
    durationMinutes,
    shareEvent,
    goToEventsRoot,
    showOpenGoingCta,
    requiresExternalRegistration,
    isGoing,
    isGoingBusy: isToggling,
    handleToggleGoing,
    handleRegister,
    secondaryActions,
    showEditModal,
    openEditModal,
    closeEditModal,
    showShareAccessModal,
    closeShareAccessModal,
    canShareAccess,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
    attendeesCount: event?.attendees_count ?? 0,
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
    isAuthModalOpen: isModalOpen,
    closeAuthModal: closeModal,
  };
};
