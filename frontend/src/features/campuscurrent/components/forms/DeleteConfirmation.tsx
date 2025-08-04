import { Button } from '@/components/atoms/button';

interface DeleteConfirmationProps {
  isVisible: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmation({ 
  isVisible, 
  isDeleting, 
  onCancel, 
  onConfirm 
}: DeleteConfirmationProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 text-red-800">
        <span className="font-medium">Delete Event</span>
      </div>
      <p className="text-sm text-red-700">
        Are you sure you want to delete this event? This action cannot be undone.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete Event"}
        </Button>
      </div>
    </div>
  );
}