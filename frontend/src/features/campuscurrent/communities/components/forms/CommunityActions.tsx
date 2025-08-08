import { Button } from "@/components/atoms/button";
import { useCommunityForm } from "@/context/CommunityFormContext";

interface CommunityActionsProps {
  isProcessing: boolean;
  showDeleteConfirm: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export function CommunityActions({
  isProcessing,
  showDeleteConfirm,
  onClose,
  onSubmit,
  onDelete,
}: CommunityActionsProps) {
  const { isEditMode } = useCommunityForm();

  return (
    <div className="flex justify-end space-x-4">
      <Button
        variant="outline"
        onClick={onClose}
        disabled={isProcessing || showDeleteConfirm}
      >
        Cancel
      </Button>
      {isEditMode && (
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isProcessing || showDeleteConfirm}
        >
          Delete
        </Button>
      )}
      <Button
        onClick={onSubmit}
        disabled={isProcessing || showDeleteConfirm}
      >
        {isProcessing ? "Processing..." : isEditMode ? "Save Changes" : "Create"}
      </Button>
    </div>
  );
}

