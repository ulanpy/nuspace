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
    date,
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
    !date || 
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
    <div className="flex justify-between pt-4 border-t">
      <div>
        {isEditMode && permissions?.can_delete && (
          <Button 
            variant="destructive"
            onClick={onDelete}
            disabled={isProcessing || showDeleteConfirm}
          >
            Delete Event
          </Button>
        )}
      </div>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onClose}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isSubmitDisabled}
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