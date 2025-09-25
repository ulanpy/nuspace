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
    startDate: Date | undefined,
    startTime: string,
    endDate: Date | undefined,
    endTime: string,
    isCommunityEvent: boolean,
    selectedCommunity: Community | null,
    resetForm: () => void
  ) => {
    if (!user || !startDate || !endDate) return;

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

    // Combine start date and time for start_datetime in UTC
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const startDay = startDate.getDate();
    const [startHoursStr, startMinutesStr] = startTime ? startTime.split(":") : ["0", "0"];
    const startHoursNum = parseInt(startHoursStr, 10) || 0;
    const startMinutesNum = parseInt(startMinutesStr, 10) || 0;
    const startDateTime = new Date(
      Date.UTC(startYear, startMonth, startDay, startHoursNum, startMinutesNum, 0, 0)
    ).toISOString();

    // Combine end date and time for end_datetime in UTC
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    const endDay = endDate.getDate();
    const [endHoursStr, endMinutesStr] = endTime ? endTime.split(":") : ["0", "0"];
    const endHoursNum = parseInt(endHoursStr, 10) || 0;
    const endMinutesNum = parseInt(endMinutesStr, 10) || 0;
    const endDateTime = new Date(
      Date.UTC(endYear, endMonth, endDay, endHoursNum, endMinutesNum, 0, 0)
    ).toISOString();

    // Validate that end datetime is after start datetime
    if (new Date(endDateTime) <= new Date(startDateTime)) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isEditMode && event) {
        // Update existing event
         const editData: EditEventData = {
          name: formData.name,
          place: formData.place,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          description: formData.description,
          policy: formData.policy,
           registration_link: (formData as any).registration_link,
          type: formData.type as EventType,
        };

        // Only include status if user has permission to edit it
        if (permissions?.editable_fields.includes('status' as any)) {
          editData.status = 'status' in formData ? formData.status : event.status;
        }

        // Only include tag if user has permission to edit it
        if (permissions?.editable_fields.includes('tag' as any)) {
          editData.tag = 'tag' in formData ? formData.tag : event.tag;
        }
        
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
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          description: formData.description || "",
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

        {/* Info: Create Your Own Event */}
        <div className="rounded-lg border border-amber-200/60 dark:border-amber-700/30 bg-gradient-to-r from-amber-50 to-pink-50 dark:from-amber-900/20 dark:to-pink-900/10 p-4">
            <div className="text-sm md:text-base">
              <div className="font-semibold">Create Your Own Event</div>
              <div>
                On Nuspace, you can create anything from casual meetups to big events. Formal ones (with NU facilities, guests, or support) should follow
                {" "}
                <a
                  href="https://my.nu.edu.kz/wps/myportal/student/!ut/p/b1/04_SjzQ0MTI0MDW2NDDRj9CPykssy0xPLMnMz0vMAfGjzOKN_ANdHZ0MHQ3cw_wsDAI9LUP9gy38jAzcDYEKIoEKDHAARwNC-sP1o9CU-BiaGTh6ewWauplbGhm4mEAV4LHCzyM_N1U_NyrH0lPXUREA623GtQ!!/dl4/d5/L2dQX19fX19fX3chIS9ZQTRNQUFBQUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJSUlJQS80SmtHWWhtWVpoR1pSbU1abkdZSm1TWmltWnBtR1psbVk1bWVaZ1daRm1KWm1XWVZtVlpqV1oxbURaazJZdG1iWmgyWmRtUFpuMllEbVE1aU9aam1FNWxPWXptYzVndVpMbUs1bXVZYm1XNWp1WjdtQnchIS9aNl8yT1FFQUIxQTBHVk44MFFJOVVPUzhOMjBHMS9aNl8yT1FFQUIxQTBPTFE3MFFJSEJENUM0MzBHMS9aNl8yT1FFQUIxQTBPTFE3MFFJSEJENUM0MzA4NS9aNl8yT1FFQUIxQTBPTFE3MFFJSEJENUM0MzA0Ni9aNl8yT1FFQUIxQTBPTFE3MFFJSEJENUM0MzBLMC9aNl8yT1FFQUIxQTBPTFE3MFFJSEJENUM0MzBLNS9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDA0My9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MEdPMi9aNl8yT1FFQUIxQTBHMTA4MFFQMzdKVFZLMzA4Mi9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MEc0NC9aNl8yT1FFQUIxQTBPS0E1MFFJUEk1Szk4MjBHNy9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjBTNC9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjAyMi9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjBJNi9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjBBMS9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjBRNS9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjA2My9aNl8yT1FFQUIxQTBPRktDMFFORlVOVlFNMjBNNy9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MEc0My9aNl8yT1FFQUIxQTBPSzFFMDZFVUJGMFIyMTA4MC9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTA2MS9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTA2My9aNl8yT1FFQUIxQTBHMDA4MFFJUE85RUxVMDBHMS9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTBNNy9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTBFNC9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTBFNi9aNl8yT1FFQUIxQTAwVlIzMFFQRVBMOUdRMTBFNS9aNl8yT1FFQUIxQTBHMDA4MFFJUE85RUxVMDBPNi9aNl8yT1FFQUIxQTBHMDA4MFFJUE85RUxVMDA4NC9aNl8yT1FFQUIxQTBPTUI2MFFWOUlKUUFQMDA0Mi9aNl8yT1FFQUIxQTBHUkwwMFFGTVY5N0FTMktCNS9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBBMi9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBRMC9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDA2NC9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBFNi9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBIMi9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDA5Ni9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDA1MC9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBMNC9aNl8yT1FFQUIxQTBPNzI4MFFCVUpHUUJPMzBHMS9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBUMi9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDAzMC9aNl8yT1FFQUIxQTAwMEhGMFFGTVZIVVFVMzBHMS9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBCMy9aNl8yT1FFQUIxQTBHMDA4MFFJUE85RUxVMDBTNC9aNl8yT1FFQUIxQTBHRlE3MFFJSEJIRVY5MDBCMi9aNl8yT1FFQUIxQTAwTE82MFEzTzBWSjk5MjA4MC9aNl8yT1FFQUIxQTBHMDA4MFFJUE85RUxVMDBJNw!!/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  NU guidelines
                </a>
                .
              </div>
            </div>
          </div>


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
    startDate: Date | undefined,
    startTime: string,
    endDate: Date | undefined,
    endTime: string,
    isCommunityEvent: boolean,
    selectedCommunity: Community | null,
    resetForm: () => void
  ) => void;
  onDelete: () => void;
}) {
  const formContext = useEventForm();
  const {
    formData,
    startDate,
    startTime,
    endDate,
    endTime,
    isCommunityEvent,
    selectedCommunity,
    resetForm,
  } = formContext;

  const handleSubmit = () => {
    onSubmit(formData, startDate, startTime, endDate, endTime, isCommunityEvent, selectedCommunity, resetForm);
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