import { Button } from '@/components/atoms/button';
import { useEventForm } from '../../../../../context/EventFormContext';
import { useTelegramBottomButtons } from '@/hooks/useTelegramBottomButtons';

interface EventActionsProps {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onSubmit: () => void;
  onDelete: () => void;
}

export function EventActions({
  isProcessing,
  showDeleteConfirm,
  onSubmit,
  onDelete,
}: EventActionsProps) {
  const {
    formData,
    startDate,
    startTime,
    endDate,
    endTime,
    isEditMode,
    permissions,
    isCommunityEvent,
    selectedCommunity,
  } = useEventForm();

  const requiresRegistrationLink = formData.policy === 'registration';
  const hasRegistrationLink = Boolean((formData as any).registration_link && (formData as any).registration_link.trim().length > 0);

  const isSubmitDisabled = 
    isProcessing || 
    !formData.name || 
    !formData.place || 
    !formData.description || 
    !startDate || 
    !startTime ||
    !endDate ||
    !endTime ||
    (requiresRegistrationLink && !hasRegistrationLink) ||
    (isEditMode && !permissions?.can_edit) || 
    (!isEditMode && isCommunityEvent && !selectedCommunity);

  // Telegram Mini App bottom button integration
  useTelegramBottomButtons({
    enabled: false,
    text: isProcessing ? (isEditMode ? 'Updating…' : 'Creating…') : (isEditMode ? 'Update Event' : 'Create Event'),
    disabled: true,
    show: false,
    showProgress: true,
    onClick: onSubmit,
  });

  return (
    <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
      {isEditMode && permissions?.can_delete && (
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isProcessing || showDeleteConfirm}
          className="w-full sm:w-auto"
        >
          Delete Event
        </Button>
      )}

      <Button 
        onClick={onSubmit} 
        disabled={isSubmitDisabled}
        className="w-full min-w-[160px] sm:w-auto"
      >
          {isProcessing ? 
            (isEditMode ? "Updating..." : "Creating...") : 
            (isEditMode ? "Update Event" : "Create Event")
          }
      </Button>
    </div>
  );
}