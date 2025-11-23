import { Button } from "@/components/atoms/button";
import { useCommunityForm } from "@/context/CommunityFormContext";
import { useTelegramBottomButtons } from "@/hooks/useTelegramBottomButtons";

interface CommunityActionsProps {
  isProcessing: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  isValid: boolean;
  onDelete?: () => void;
}

export function CommunityActions({
  isProcessing,
  onCancel,
  onSubmit,
  isValid,
  onDelete,
}: CommunityActionsProps) {
  const {
    permissions,
    isEditMode,
  } = useCommunityForm();

  const primaryLabel = isProcessing
    ? (isEditMode ? "Updating…" : "Creating…")
    : (isEditMode ? "Update Community" : "Create Community");

  const lacksRequiredPermission = isEditMode
    ? permissions?.can_edit === false
    : false;

  const isPrimaryDisabled =
    isProcessing || lacksRequiredPermission || !isValid;

  useTelegramBottomButtons({
    enabled: true,
    text: primaryLabel,
    disabled: isPrimaryDisabled,
    show: true,
    showProgress: true,
    onClick: onSubmit,
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t">
      <div className="flex gap-2 order-2 sm:order-1 w-full sm:w-auto">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
      </div>
      <div className="flex gap-2 justify-end order-1 sm:order-2 w-full sm:w-auto">
        {isEditMode && permissions?.can_delete && onDelete && (
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isProcessing}
            className="min-w-[140px]"
          >
            Delete Community
          </Button>
        )}
        <Button
          onClick={onSubmit}
          disabled={isPrimaryDisabled}
          className="min-w-[140px]"
        >
          {primaryLabel}
        </Button>
      </div>
    </div>
  );
}

