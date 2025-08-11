import { Button } from '@/components/atoms/button';
import { useEventForm } from '../../../../../context/EventFormContext';

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

  const isSubmitDisabled = 
    isProcessing || 
    !formData.name || 
    !formData.place || 
    !formData.description || 
    !date || 
    (isEditMode && !permissions?.can_edit) || 
    (!isEditMode && isCommunityEvent && !selectedCommunity);

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