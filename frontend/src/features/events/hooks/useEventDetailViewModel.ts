import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/data/routes";
import { useToast } from "@/hooks/use-toast";
import { addToGoogleCalendar as addToGoogleCalendarUtil } from "@/features/events/utils/calendar";
import { useEvent } from "./useEvent";
import type { Event } from "@/features/shared/campus/types";
import { EventPolicy } from "@/features/shared/campus/types";

export type EventActionId = "calendar" | "register" | "edit";

export type EventActionDescriptor = {
  id: EventActionId;
  label: string;
  variant?: "default" | "outline";
  href?: string;
  onClick?: () => void;
  openInNewTab?: boolean;
};

const getCommunityProfileImage = (event: Event | null) =>
  event?.community?.media?.find((m) => m.media_format === "profile")?.url ||
  event?.community?.media?.[0]?.url ||
  null;

export const useEventDetailViewModel = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { event, isLoading, isError } = useEvent();

  const [showEditModal, setShowEditModal] = useState(false);
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

  const communityProfileImg = useMemo(
    () => getCommunityProfileImage(event),
    [event]
  );

  const handleAddToCalendar = useCallback(() => {
    if (!event) return;
    addToGoogleCalendarUtil(event);
    toast({
      title: "Success",
      description: "Event added to your Google Calendar",
    });
  }, [event, toast]);

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
  }, [event, toast]);

  const goToEventsRoot = useCallback(() => {
    navigate(ROUTES.APPS.CAMPUS_CURRENT.ROOT);
  }, [navigate]);

  const communityId = event?.community?.id;
  const goToCommunity = useCallback(() => {
    if (!communityId) return;
    navigate(
      ROUTES.APPS.CAMPUS_CURRENT.COMMUNITY.DETAIL_FN(String(communityId))
    );
  }, [communityId, navigate]);

  const openEditModal = useCallback(() => setShowEditModal(true), []);
  const closeEditModal = useCallback(() => setShowEditModal(false), []);

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const actionDescriptors: EventActionDescriptor[] = useMemo(() => {
    if (!event) return [];
    const actions: EventActionDescriptor[] = [];

    if (!isPast && event.type !== "recruitment") {
      actions.push({
        id: "calendar",
        label: "Add to Calendar",
        onClick: handleAddToCalendar,
      });
    }

    if (
      !isPast &&
      event.policy === EventPolicy.registration &&
      event.registration_link
    ) {
      actions.push({
        id: "register",
        label: "Register",
        href: event.registration_link,
        openInNewTab: true,
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

    return actions;
  }, [event, handleAddToCalendar, isPast, openEditModal]);

  return {
    event,
    isLoading,
    isError,
    isPast,
    durationMinutes,
    communityProfileImg,
    shareEvent,
    goToEventsRoot,
    goToCommunity,
    actionDescriptors,
    showEditModal,
    openEditModal,
    closeEditModal,
    imageLoaded,
    imageError,
    handleImageLoad,
    handleImageError,
  };
};

