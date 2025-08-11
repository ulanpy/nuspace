import { useState } from "react";
import { Modal } from "@/components/atoms/modal";
import { useCreateEvent } from "@/features/campuscurrent/events/hooks/useCreateEvent";
import { useUpdateEvent } from "@/features/campuscurrent/events/hooks/useUpdateEvent";
import { useDeleteEvent } from "@/features/campuscurrent/events/hooks/useDeleteEvent";
// import { useMediaUploadContext } from "@/context/MediaUploadContext";
import { useUser } from "@/hooks/use-user";
import { CreateEventData, EditEventData, EventType, Event, EventPermissions, Community } from "@/features/campuscurrent/types/types";
import { CommunitySelectionModal } from "@/features/campuscurrent/communities/components/CommunitySelectionModal";

// Import all the new modular components
import { EventScopeSelector, CommunityDisplay } from "./forms/EventScopeSelector";
import { UnifiedEventMediaUpload } from "./UnifiedEventMediaUpload";
import { EventDetailsForm } from "./forms/EventDetailsForm";
import { EventDateTimeSelector } from "./forms/EventDateTimeSelector";
import { EventElevatedFields } from "./forms/EventElevatedFields";
import { EventDescription } from "./forms/EventDescription";
import { EventPolicy } from "@/features/campuscurrent/types/types";
import { DeleteConfirmation } from "@/components/molecules/DeleteConfirmation";
import { EventActions } from "./forms/EventActions";
import { useEventForm, EventFormProvider } from "@/context/EventFormContext";
import { useInitializeMedia } from "@/features/media/hooks/useInitializeMedia";
import { useToast } from "@/hooks/use-toast";
import { LoginModal } from "@/components/molecules/login-modal";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode: boolean;
  communityId?: number;
  initialCommunity?: Community;
  event?: Event;
  permissions?: EventPermissions;
}

export function EventModal({ isOpen, onClose, isEditMode, communityId, initialCommunity, event, permissions }: EventModalProps) {
  const { user } = useUser();
  const { handleCreate, isCreating } = useCreateEvent();
  const { handleUpdate, isUpdating } = useUpdateEvent();
  const { handleDelete, isDeleting } = useDeleteEvent();
  // const { isUploading } = useMediaUploadContext();

  const isProcessing = isCreating || isUpdating || isDeleting;
  const { toast } = useToast();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);

  // Initialize media for edit/create flows via shared hook
  useInitializeMedia({ isEditMode, mediaItems: event?.media });

  const handleSubmit = async (
    formData: CreateEventData | EditEventData,
    date: Date | undefined,
    time: string,
    isCommunityEvent: boolean,
    selectedCommunity: Community | null,
    resetForm: () => void
  ) => {
    if (!user || !date) return;

    // Validate registration link requirement
    if (
      formData.policy === "registration" &&
      !((formData as any).registration_link && (formData as any).registration_link.trim().length > 0)
    ) {
      toast({
        title: "Registration link required",
        description: "Please provide a registration link or change the policy to Open Entry.",
        variant: "destructive",
      });
      return;
    }

    // Combine date and time for event_datetime in UTC to avoid timezone shifts
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const [hoursStr, minutesStr] = time ? time.split(":") : ["0", "0"];
    const hoursNum = parseInt(hoursStr, 10) || 0;
    const minutesNum = parseInt(minutesStr, 10) || 0;
    const eventDateTime = new Date(
      Date.UTC(year, month, day, hoursNum, minutesNum, 0, 0)
    ).toISOString();

    try {
      if (isEditMode && event) {
        // Update existing event
         const editData: EditEventData = {
          name: formData.name,
          place: formData.place,
          event_datetime: eventDateTime,
          description: formData.description,
          duration: Number(formData.duration),
          policy: formData.policy,
           registration_link: (formData as any).registration_link,
          status: 'status' in formData ? formData.status : event.status,
          type: formData.type as EventType,
          tag: 'tag' in formData ? formData.tag : event.tag,
        };
        
        await handleUpdate(event.id.toString(), editData);
      } else {
        // Create new event
        const resolvedCommunityId = isCommunityEvent
          ? (selectedCommunity?.id ?? (formData as CreateEventData).community_id ?? communityId)
          : undefined;

        const createData: CreateEventData = {
          community_id: resolvedCommunityId,
          creator_sub: user.user.sub,
          policy: formData.policy as EventPolicy,
          registration_link: (formData as any).registration_link,
          name: formData.name || "",
          place: formData.place || "",
          event_datetime: eventDateTime,
          description: formData.description || "",
          duration: Number(formData.duration),
          type: formData.type as EventType,
        };

        await handleCreate(createData);
      }
      
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} event:`, error);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!event) return;
    
    try {
      await handleDelete(event.id.toString());
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  // Require authentication to use the modal
  if (!user) {
    return (
      <LoginModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onClose}
        title="Login Required"
        message={isEditMode ? "You need to be logged in to edit events." : "You need to be logged in to create events."}
      />
    );
  }

  return (
    <EventFormProvider
      isEditMode={isEditMode}
      event={event}
      communityId={communityId}
      initialCommunity={initialCommunity}
      permissions={permissions}
    >
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Edit Event" : "Create Event"}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-6">
          {/* Event Scope - Personal vs Community */}
          <EventScopeSelector onCommunityModalOpen={() => setShowCommunityModal(true)} />

          {/* Community Display for Edit Mode */}
          <CommunityDisplay />

          {/* Media Upload Section */}
          <UnifiedEventMediaUpload />

          {/* Event Details */}
          <EventDetailsForm />

          {/* Date and Time */}
          <EventDateTimeSelector />

          {/* Admin Fields (Tag & Status) */}
          <EventElevatedFields />

          {/* Description */}
          <EventDescription />



          {/* Delete Confirmation */}
          <DeleteConfirmation
            title="Event"
            isVisible={showDeleteConfirm}
            isDeleting={isDeleting}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteConfirm}
          />

          {/* Actions */}
          <EventActionsWrapper
            isProcessing={isProcessing}
            showDeleteConfirm={showDeleteConfirm}
            onClose={onClose}
            onSubmit={handleSubmit}
            onDelete={handleDeleteClick}
          />
        </div>
      </Modal>

      {/* Community Selection Modal */}
      <CommunitySelectionWrapper
        isOpen={showCommunityModal}
        onClose={() => setShowCommunityModal(false)}
        communityId={communityId}
      />
    </EventFormProvider>
  );
}

// Wrapper component to handle community selection with form context
function CommunitySelectionWrapper({
  isOpen,
  onClose,
  communityId,
}: {
  isOpen: boolean;
  onClose: () => void;
  communityId?: number;
}) {
  const { selectedCommunity, handleCommunitySelect } = useEventForm();

  const handleSelect = (community: Community) => {
    handleCommunitySelect(community);
    onClose();
  };

  return (
    <CommunitySelectionModal
      isOpen={isOpen}
      onClose={onClose}
      onSelect={handleSelect}
      selectedCommunityId={selectedCommunity?.id ?? communityId}
    />
  );
}

// Wrapper component to handle form context within EventActions
function EventActionsWrapper({
  isProcessing,
  showDeleteConfirm,
  onClose,
  onSubmit,
  onDelete,
}: {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onSubmit: (
    formData: CreateEventData | EditEventData,
    date: Date | undefined,
    time: string,
    isCommunityEvent: boolean,
    selectedCommunity: Community | null,
    resetForm: () => void
  ) => void;
  onDelete: () => void;
}) {
  const formContext = useEventForm();
  const {
    formData,
    date,
    time,
    isCommunityEvent,
    selectedCommunity,
    resetForm,
  } = formContext;

  const handleSubmit = () => {
    onSubmit(formData, date, time, isCommunityEvent, selectedCommunity, resetForm);
  };

  return (
    <EventActions
      isProcessing={isProcessing}
      showDeleteConfirm={showDeleteConfirm}
      onClose={onClose}
      onSubmit={handleSubmit}
      onDelete={onDelete}
    />
  );
}