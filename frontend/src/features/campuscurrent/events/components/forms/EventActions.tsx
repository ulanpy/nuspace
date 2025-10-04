import { Button } from '@/components/atoms/button';
import { useEventForm } from '../../../../../context/EventFormContext';
import { useTelegramBottomButtons } from '@/hooks/useTelegramBottomButtons';

interface EventActionsProps {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function EventActions({
  isProcessing,
  showDeleteConfirm,
  onClose,
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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t">
      <div className="flex gap-2 order-2 sm:order-1 w-full sm:w-auto">
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
          variant="outline" 
          onClick={onClose}
          disabled={isProcessing}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
      
      <div className="flex gap-2 justify-end order-1 sm:order-2 w-full sm:w-auto">
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitDisabled}
          className="min-w-[160px]"
        >
          {isProcessing ? 
            (isEditMode ? "Updating..." : "Creating...") : 
            (isEditMode ? "Update Event" : "Create Event")
          }
        </Button>
      </div>
    </div>
  );
}