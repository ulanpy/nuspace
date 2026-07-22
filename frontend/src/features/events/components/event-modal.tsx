"use client";

import { useState } from "react";
import { Modal } from "@/components/atoms/modal";
import { useCreateEvent } from '@/features/events/hooks/use-create-event';
import { useUpdateEvent } from '@/features/events/hooks/use-update-event';
import { useDeleteEvent } from '@/features/events/hooks/use-delete-event';
import { useUser } from "@/hooks/use-user";
import { CreateEventData, EditEventData, EventType, Event, EventPermissions } from "@/features/shared/campus/types";

import { UnifiedEventMediaUpload } from './unified-event-media-upload';
import { EventDetailsForm } from './forms/event-details-form';
import { EventDateTimeSelector } from './forms/event-date-time-selector';
import { EventElevatedFields } from './forms/event-elevated-fields';
import { EventDescription } from './forms/event-description';
import { EventPolicy } from "@/features/shared/campus/types";
import { DeleteConfirmation } from '@/components/molecules/delete-confirmation';
import { EventActions } from './forms/event-actions';
import { useEventForm, EventFormProvider } from '@/context/event-form-context';
import { useInitializeMedia } from '@/features/media/hooks/use-initialize-media';
import { useToast } from "@/hooks/use-toast";
import { campusWallClockToIso } from "@/features/events/utils/campus-datetime";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditMode: boolean;
  event?: Event;
  permissions?: EventPermissions;
}

export function EventModal({ isOpen, onClose, isEditMode, event, permissions }: EventModalProps) {
  const { user } = useUser();
  const { handleCreate, isCreating } = useCreateEvent();
  const { handleUpdate, isUpdating } = useUpdateEvent();
  const { handleDelete, isDeleting } = useDeleteEvent();

  const isProcessing = isCreating || isUpdating || isDeleting;
  const { toast } = useToast();
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useInitializeMedia({ isEditMode, mediaItems: event?.media });

  const handleSubmit = async (
    formData: CreateEventData | EditEventData,
    startDate: Date | undefined,
    startTime: string,
    endDate: Date | undefined,
    endTime: string,
    resetForm: () => void
  ) => {
    if (!user || !startDate || !endDate) return;

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

    const startDateTime = campusWallClockToIso(startDate, startTime);
    const endDateTime = campusWallClockToIso(endDate, endTime);

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

        if (permissions?.editable_fields.includes('tag' as any)) {
          editData.tag = 'tag' in formData ? formData.tag : event.tag;
        }
        
        await handleUpdate(event.id.toString(), editData);
      } else {
        const createData: CreateEventData = {
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

  if (!user) return null;

  return (
    <EventFormProvider
      isEditMode={isEditMode}
      event={event}
      permissions={permissions}
    >
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditMode ? "Edit Event" : "Create Event"}
        className="w-full max-w-4xl"
      >
        <div className="flex w-full flex-col gap-6">

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

          <UnifiedEventMediaUpload />

          <EventDetailsForm />

          <EventDateTimeSelector />

          <EventElevatedFields />

          <EventDescription />

          <DeleteConfirmation
            title="Event"
            isVisible={showDeleteConfirm}
            isDeleting={isDeleting}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteConfirm}
          />

          <EventActionsWrapper
            isProcessing={isProcessing}
            showDeleteConfirm={showDeleteConfirm}
            onSubmit={handleSubmit}
            onDelete={handleDeleteClick}
          />
        </div>
      </Modal>
    </EventFormProvider>
  );
}

function EventActionsWrapper({
  isProcessing,
  showDeleteConfirm,
  onSubmit,
  onDelete,
}: {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onSubmit: (
    formData: CreateEventData | EditEventData,
    startDate: Date | undefined,
    startTime: string,
    endDate: Date | undefined,
    endTime: string,
    resetForm: () => void
  ) => void;
  onDelete: () => void;
}) {
  const {
    formData,
    startDate,
    startTime,
    endDate,
    endTime,
    resetForm,
  } = useEventForm();

  const handleSubmit = () => {
    onSubmit(formData, startDate, startTime, endDate, endTime, resetForm);
  };

  return (
    <EventActions
      isProcessing={isProcessing}
      showDeleteConfirm={showDeleteConfirm}
      onSubmit={handleSubmit}
      onDelete={onDelete}
    />
  );
}
